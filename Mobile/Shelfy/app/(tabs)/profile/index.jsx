import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import * as authApi from '../../../src/api/authApi';
import { uploadApi } from '../../../src/api/uploadApi';
import { subscriptionApi } from '../../../src/api/subscriptionApi';
import { wardrobeApi } from '../../../src/api/wardrobeApi';
import Avatar from '../../../src/components/common/Avatar';
import AppButton from '../../../src/components/common/AppButton';
import AppInput from '../../../src/components/common/AppInput';
import LoadingOverlay from '../../../src/components/common/LoadingOverlay';
import ErrorBanner from '../../../src/components/common/ErrorBanner';
import { colors } from '../../../src/constants/colors';
import { typography } from '../../../src/constants/typography';
import { radius, shadows, spacing } from '../../../src/constants/spacing';

export default function ProfileScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [planStatus, setPlanStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Edit Name Modal state
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  // Change Password Modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const s = await wardrobeApi.getStats();
        setStats(s);
      } catch {
        // Ignore
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    let isMounted = true;
    subscriptionApi.getMyPlan()
      .then((plan) => { if (isMounted) setPlanStatus(plan); })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleChangeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        setLoadingMsg('Đang cập nhật ảnh đại diện...');
        const asset = result.assets[0];
        const uploadRes = await uploadApi.uploadAvatar(asset.uri, 'avatar.jpg', 'image/jpeg');
        const updated = await authApi.updateProfile({
          avatar: { secureUrl: uploadRes.secureUrl, publicId: uploadRes.publicId },
        });
        await refreshUser(updated);
        Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện mới!');
      }
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể đổi ảnh đại diện');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống');
      return;
    }

    setLoading(true);
    setLoadingMsg('Đang lưu thông tin...');
    try {
      const updated = await authApi.updateProfile({ fullName: newName.trim() });
      await refreshUser(updated);
      setNameModalVisible(false);
      Alert.alert('Thành công', 'Đã cập nhật tên hiển thị!');
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể đổi tên hiển thị');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setPasswordError('');
    setLoading(true);
    setLoadingMsg('Đang cập nhật mật khẩu...');
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      Alert.alert('Thành công', 'Đã đổi mật khẩu thành công!');
    } catch (err) {
      setPasswordError(err.message || 'Mật khẩu hiện tại không chính xác');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setDeleteError('Vui lòng nhập mật khẩu hiện tại.'); return; }
    setLoading(true);
    setLoadingMsg('Đang xóa dữ liệu và ảnh của bạn...');
    try {
      await authApi.deleteAccount(deletePassword);
      setDeleteModalVisible(false);
      setDeletePassword('');
      Alert.alert('Đã xóa tài khoản', 'Tài khoản, dữ liệu và ảnh của bạn đã được xóa.');
      router.replace('/(auth)/login');
    } catch (error) {
      setDeleteError(error.message || 'Chưa thể xóa tài khoản. Vui lòng thử lại.');
    } finally { setLoading(false); setLoadingMsg(''); }
  };

  const plan = planStatus?.planId || user?.plan || 'FREE';
  const storageUsed = stats?.totalItems ?? user?.storageUsed ?? 0;
  const storageLimit = planStatus?.wardrobeLimit ?? 100;
  const tryOnToday = planStatus?.quota?.used ?? user?.tryOnCountToday ?? 0;
  const tryOnLimit = planStatus?.quota?.limit ?? user?.tryOnLimit ?? 5;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LoadingOverlay visible={loading} message={loadingMsg} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <Avatar
            uri={user?.avatarUrl}
            name={user?.fullName || user?.email}
            size={84}
            showEditBadge
            onPress={handleChangeAvatar}
            style={styles.avatar}
          />

          <Text style={styles.fullName}>{user?.fullName || 'Người dùng Shelfy'}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.planBadge}>
            <MaterialIcons
              name={plan === 'FREE' ? 'workspace-premium' : 'star'}
              size={14}
              color={colors.primary}
            />
            <Text style={styles.planText}>Gói {plan}</Text>
          </View>
        </View>

        {/* Quota & Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsCardTitle}>Dung lượng & Hạn mức</Text>

          <View style={styles.statRow}>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Tủ đồ lưu trữ</Text>
              <Text style={styles.statValue}>
                {storageLimit < 0 ? `${storageUsed} món · Không giới hạn` : `${storageUsed} / ${storageLimit} món`}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${storageLimit < 0 ? 100 : Math.min(100, (storageUsed / storageLimit) * 100)}%`,
                    backgroundColor: storageUsed > storageLimit ? colors.error : colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statRow}>
            <View style={styles.statInfo}>
                <Text style={styles.statLabel}>
                  Lượt thử đồ AI {planStatus?.quota?.period === 'MONTH' ? 'tháng này' : 'hôm nay'}
                </Text>
              <Text style={styles.statValue}>
                {tryOnToday} / {tryOnLimit} lượt
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, (tryOnToday / tryOnLimit) * 100)}%`,
                    backgroundColor: colors.secondary,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Pressable
            onPress={() => router.push('/(tabs)/profile/favorites')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.errorLight }]}>
              <MaterialIcons name="favorite" size={20} color={colors.error} />
            </View>
            <Text style={styles.menuTitle}>Món đồ yêu thích</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            onPress={() => router.push('/(tabs)/profile/wear-history')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="history" size={20} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>Lịch sử trang phục</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            onPress={() => router.push('/(tabs)/profile/premium')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.goldLight }]}>
              <MaterialIcons name="diamond" size={20} color={colors.gold} />
            </View>
            <View style={styles.menuTitleContainer}>
              <Text style={styles.menuTitle}>Nâng cấp Premium</Text>
              <View style={styles.hotBadge}>
                <Text style={styles.hotBadgeText}>PRO</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            onPress={() => router.push('/(tabs)/profile/payment-history')}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.successLight }]}>
              <MaterialIcons name="receipt-long" size={20} color={colors.success} />
            </View>
            <Text style={styles.menuTitle}>Lịch sử thanh toán</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Account Settings Menu */}
        <View style={styles.menuSection}>
          <Pressable
            onPress={() => {
              setNewName(user?.fullName || '');
              setNameModalVisible(true);
            }}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.surfaceVariant }]}>
              <MaterialIcons name="edit" size={20} color={colors.onSurface} />
            </View>
            <Text style={styles.menuTitle}>Đổi tên hiển thị</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            onPress={() => {
              setPasswordError('');
              setPasswordModalVisible(true);
            }}
            style={styles.menuItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.surfaceVariant }]}>
              <MaterialIcons name="lock" size={20} color={colors.onSurface} />
            </View>
            <Text style={styles.menuTitle}>Đổi mật khẩu</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Logout Button */}
        <AppButton title="Xóa tài khoản" variant="ghost" size="md"
          textStyle={{ color: colors.error }}
          onPress={() => { setDeleteError(''); setDeletePassword(''); setDeleteModalVisible(true); }} />
        <AppButton
          title="Đăng xuất"
          onPress={handleLogout}
          variant="ghost"
          size="md"
          icon={<Ionicons name="log-out-outline" size={20} color={colors.error} />}
          textStyle={{ color: colors.error }}
          style={styles.logoutBtn}
        />
      </ScrollView>

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => !loading && setDeleteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Xóa tài khoản Shelfy?</Text>
            <Text>Tủ đồ, hồ sơ, lịch sử và ảnh của bạn sẽ bị xóa. Thao tác không thể hoàn tác. Một số bản ghi giao dịch được giữ để đối soát.</Text>
            <ErrorBanner message={deleteError} onDismiss={() => setDeleteError('')} />
            <AppInput label="Mật khẩu hiện tại" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry />
            <View style={styles.modalActionsRow}>
              <AppButton title="Hủy" variant="ghost" disabled={loading} onPress={() => setDeleteModalVisible(false)} style={styles.modalBtn} />
              <AppButton title="Xóa tài khoản" disabled={loading} onPress={handleDeleteAccount} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Name */}
      <Modal visible={nameModalVisible} transparent animationType="fade">
        <Pressable
          onPress={() => setNameModalVisible(false)}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Đổi tên hiển thị</Text>
            <AppInput
              label="Họ và tên mới"
              value={newName}
              onChangeText={setNewName}
              placeholder="Nhập họ và tên"
            />
            <View style={styles.modalActionsRow}>
              <AppButton
                title="Hủy"
                onPress={() => setNameModalVisible(false)}
                variant="ghost"
                size="md"
                style={styles.modalBtn}
              />
              <AppButton
                title="Cập nhật"
                onPress={handleUpdateName}
                size="md"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Modal: Change Password */}
      <Modal visible={passwordModalVisible} transparent animationType="fade">
        <Pressable
          onPress={() => setPasswordModalVisible(false)}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            <ErrorBanner message={passwordError} onDismiss={() => setPasswordError('')} />

            <AppInput
              label="Mật khẩu hiện tại"
              placeholder="••••••••"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />

            <AppInput
              label="Mật khẩu mới"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <AppInput
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
            />

            <View style={styles.modalActionsRow}>
              <AppButton
                title="Hủy"
                onPress={() => setPasswordModalVisible(false)}
                variant="ghost"
                size="md"
                style={styles.modalBtn}
              />
              <AppButton
                title="Đổi mật khẩu"
                onPress={handleChangePassword}
                size="md"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  fullName: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  email: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm + 2,
  },
  planText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '700',
    marginLeft: 4,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  statsCardTitle: {
    ...typography.titleSm,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  statRow: {
    paddingVertical: spacing.xs,
  },
  statInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceMedium,
  },
  statValue: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statDivider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginVertical: spacing.md,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  menuTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hotBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  hotBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginLeft: 62,
  },
  logoutBtn: {
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    minWidth: 100,
  },
});
