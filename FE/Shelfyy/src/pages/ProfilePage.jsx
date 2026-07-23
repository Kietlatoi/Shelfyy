import { useEffect, useState } from 'react';
import { userApi } from '../api/userApi';
import { toTopNav } from '../api/adapters';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { MaterialIcon } from '../components/MaterialIcon';
import { sidebarData, topNavData } from '../const/homeData';

const emptyPasswordForm = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function formatDate(value) {
  if (!value) return 'Không giới hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không rõ';
  return date.toLocaleDateString('vi-VN');
}

function formatStorageLimit(value) {
  if (value == null || value < 0) return 'Không giới hạn';
  return `${value} món`;
}

function getInitials(profile) {
  const source = profile?.fullName || profile?.email || 'Shelfy';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function ProfileMetric({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
        <MaterialIcon name={icon} size={20} />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-primary">{value}</p>
    </div>
  );
}

export function ProfilePage() {
  const [nav, setNav] = useState(topNavData);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ fullName: '' });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let ignore = false;

    queueMicrotask(() => {
      userApi.me()
        .then((data) => {
          if (ignore) return;
          setProfile(data);
          setProfileForm({ fullName: data?.fullName || '' });
          setNav(toTopNav(data));
          setError('');
        })
        .catch((err) => {
          if (!ignore) setError(err.message || 'Không tải được hồ sơ người dùng');
        })
        .finally(() => {
          if (!ignore) setIsLoading(false);
        });
    });

    return () => {
      ignore = true;
    };
  }, []);

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage);
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const fullName = profileForm.fullName.trim();
    if (fullName.length < 2) {
      setError('Tên hiển thị cần ít nhất 2 ký tự.');
      return;
    }

    setIsSavingProfile(true);
    setError('');
    setProfileMessage('');
    try {
      const updated = await userApi.updateMe({ fullName });
      setProfile(updated);
      setProfileForm({ fullName: updated?.fullName || fullName });
      setNav(toTopNav(updated));
      setProfileMessage('Đã cập nhật hồ sơ.');
    } catch (err) {
      setError(err.message || 'Không cập nhật được hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới cần ít nhất 6 ký tự.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (passwordForm.oldPassword === passwordForm.newPassword) {
      setPasswordError('Mật khẩu mới cần khác mật khẩu hiện tại.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      await userApi.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(emptyPasswordForm);
      setPasswordMessage('Đã đổi mật khẩu.');
    } catch (err) {
      setPasswordError(err.message || 'Không đổi được mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const storageValue = `${profile?.storageUsed ?? 0} / ${formatStorageLimit(profile?.storageLimit)}`;
  const tryOnValue = `${profile?.tryOnCountToday ?? 0} / ${profile?.tryOnLimit ?? 0} lượt`;

  return (
    <>
      <Sidebar activeKey="profile" data={sidebarData} />
      <TopNav data={nav} onNotify={handleNotify} />

      <main className="ml-64 min-h-screen bg-surface-container-low px-10 pb-12 pt-24">
        <div className="mx-auto grid max-w-[1200px] gap-8">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">Tài khoản cá nhân</p>
              <h1 className="mt-2 text-4xl font-extrabold text-primary">Hồ sơ của tôi</h1>
              <p className="mt-3 max-w-2xl text-sm text-on-surface-variant">
                Quản lý thông tin hiển thị, gói sử dụng và bảo mật tài khoản Shelfy.
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
              href="#/home"
            >
              <MaterialIcon name="arrow_back" size={18} />
              Về trang chủ
            </a>
          </section>

          {isLoading ? (
            <section className="grid gap-6 xl:grid-cols-[360px_1fr]" aria-busy="true">
              <div className="h-80 animate-pulse rounded-lg bg-white" />
              <div className="h-96 animate-pulse rounded-lg bg-white" />
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[360px_1fr] xl:items-start">
              <aside className="rounded-lg border border-border-subtle bg-white p-6">
                <div className="flex flex-col items-center text-center">
                  {profile?.avatarUrl ? (
                    <img
                      alt={profile.fullName || profile.email}
                      className="h-28 w-28 rounded-full object-cover ring-4 ring-secondary-fixed"
                      src={profile.avatarUrl}
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-3xl font-extrabold text-white ring-4 ring-secondary-fixed">
                      {getInitials(profile)}
                    </div>
                  )}
                  <h2 className="mt-4 text-2xl font-extrabold text-primary">{profile?.fullName || 'Người dùng Shelfy'}</h2>
                  <p className="mt-1 text-sm font-semibold text-on-surface-variant">{profile?.email}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <span className="rounded-full bg-secondary-fixed px-3 py-1 text-xs font-extrabold text-secondary">
                      Gói {profile?.plan || 'FREE'}
                    </span>
                    <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
                      {profile?.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 border-t border-border-subtle pt-5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-on-surface-variant">Public ID</span>
                    <span className="max-w-44 truncate font-mono text-xs font-semibold text-on-surface">{profile?.publicId || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-on-surface-variant">Hạn gói</span>
                    <span className="font-semibold text-on-surface">{formatDate(profile?.planExpiresAt)}</span>
                  </div>
                </div>
              </aside>

              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <ProfileMetric icon="inventory_2" label="Tủ đồ" value={storageValue} />
                  <ProfileMetric icon="checkroom" label="Try-on hôm nay" value={tryOnValue} />
                  <ProfileMetric icon="workspace_premium" label="Gói hiện tại" value={profile?.plan || 'FREE'} />
                </div>

                <form className="rounded-lg border border-border-subtle bg-white p-6" onSubmit={handleProfileSubmit}>
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">Thông tin hiển thị</p>
                      <h2 className="mt-1 text-2xl font-extrabold text-primary">Cập nhật hồ sơ</h2>
                    </div>
                    <span className="text-xs font-semibold text-on-surface-variant">Email hiện chưa cho sửa từ FE</span>
                  </div>

                  {error && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
                      {error}
                    </div>
                  )}
                  {profileMessage && (
                    <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700" role="status">
                      {profileMessage}
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-on-surface">Tên hiển thị</span>
                      <input
                        className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                        maxLength={100}
                        minLength={2}
                        name="fullName"
                        onChange={handleProfileChange}
                        placeholder="Tên của bạn"
                        type="text"
                        value={profileForm.fullName}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-on-surface">Email</span>
                      <input
                        className="rounded-lg border border-border-subtle bg-surface-container px-4 py-3 text-sm text-on-surface-variant"
                        disabled
                        type="email"
                        value={profile?.email || ''}
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex justify-end border-t border-border-subtle pt-5">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSavingProfile}
                      type="submit"
                    >
                      <MaterialIcon name={isSavingProfile ? 'hourglass_top' : 'save'} size={18} />
                      {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>

                <form className="rounded-lg border border-border-subtle bg-white p-6" onSubmit={handlePasswordSubmit}>
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary">Bảo mật</p>
                    <h2 className="mt-1 text-2xl font-extrabold text-primary">Đổi mật khẩu</h2>
                  </div>

                  {passwordError && (
                    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
                      {passwordError}
                    </div>
                  )}
                  {passwordMessage && (
                    <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700" role="status">
                      {passwordMessage}
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-on-surface">Mật khẩu hiện tại</span>
                      <input
                        autoComplete="current-password"
                        className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                        name="oldPassword"
                        onChange={handlePasswordChange}
                        type="password"
                        value={passwordForm.oldPassword}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-on-surface">Mật khẩu mới</span>
                      <input
                        autoComplete="new-password"
                        className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                        minLength={6}
                        name="newPassword"
                        onChange={handlePasswordChange}
                        type="password"
                        value={passwordForm.newPassword}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-on-surface">Xác nhận mật khẩu mới</span>
                      <input
                        autoComplete="new-password"
                        className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                        minLength={6}
                        name="confirmPassword"
                        onChange={handlePasswordChange}
                        type="password"
                        value={passwordForm.confirmPassword}
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex justify-end border-t border-border-subtle pt-5">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-5 py-3 text-sm font-bold text-primary transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isChangingPassword}
                      type="submit"
                    >
                      <MaterialIcon name={isChangingPassword ? 'hourglass_top' : 'lock_reset'} size={18} />
                      {isChangingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
