import { changePassword, getCurrentUser, updateProfile } from './authApi';

export const userApi = {
  me: getCurrentUser,
  updateMe: updateProfile,
  changePassword,
};
