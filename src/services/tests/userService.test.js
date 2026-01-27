import {
  signIn,
  sendRegisterOtp,
  sendLoginOtp,
  sendPasswordResetOtp,
  signUpVerifyAndSetInfo,
  signOut,
  resetPasswordConfirm,
} from '../userService';
import { supabase } from '../../lib/supabase';

// mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithOtp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('login-register-reset', () => {
  // befor each test, clear all mocks
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================ signIn Test ====================
  describe('signIn', () => {
    // ================ signIn with email and password ====================
    test('Should sign in user with email and password', async () => {
      // prepare the mock data
      const mockUser = { id: '123', email: 'test@example.com' };
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });
      // call the signIn backend function
      const result = await signIn({
        account: 'test@example.com',
        password: 'password123',
        loginType: 'password',
      });
      // assert the expected result
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual({
        success: true,
        data: { user: mockUser, session: {} },
      });
    });

    test('Should return error when password is incorrect', async () => {
      // prepare the mock error
      const mockError = { message: 'Invalid login credentials' };
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });
      // call the signIn backend function
      const result = await signIn({
        account: 'test@example.com',
        password: 'FUCKYOU',
        loginType: 'password',
      });

      expect(result).toEqual({ success: false, error: mockError.message });
    });
    // ================ end signIn with email and password ====================

    // ================ signIn with OTP ====================
    test('Should sign in user with OTP', async () => {
      // prepare the mock data
      supabase.auth.verifyOtp.mockResolvedValue({
        data: { session: {} },
        error: null,
      });
      // call the signIn backend function
      const result = await signIn({
        account: 'test@example.com',
        otp: '123456',
        loginType: 'otp',
      });
      // assert the expected result
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      });
      expect(result.success).toBe(true);
    });
    // ================== end signIn with OTP ====================
  });
  // ================ end signIn Test===================

  // ================ sendRegisterOtp Test ====================
  describe('sendRegisterOtp', () => {
    test('Should send registration OTP to email', async () => {
      // prepare mock data
      supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
      // call the backend function
      const result = await sendRegisterOtp('new@example.com');
      // assert the expected result
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'new@example.com',
        options: {
          shouldCreateUser: true,
          data: {},
        },
      });
      expect(result.success).toBe(true);
    });
  });
  // ================== end sendRegisterOtp Test ====================

  // ================ sendLoginOtp Test ====================
  describe('sendLoginOtp', () => {
    test('Should send login OTP to email', async () => {
      supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
      const result = await sendLoginOtp('test@example.com');
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });
  });
  // ================== end sendLoginOtp Test ====================

  // ================ sendPasswordResetOtp Test ====================
  describe('sendPasswordResetOtp', () => {
    test('Should send password reset OTP', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
      const result = await sendPasswordResetOtp('test@example.com');
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
      expect(result.success).toBe(true);
    });
  });
  // ================== end sendPasswordResetOtp Test ====================

  // ================ resetPasswordConfirm Test ====================
  describe('resetPasswordConfirm', () => {
    test('Should verify OTP and update password', async () => {
      supabase.auth.verifyOtp.mockResolvedValue({ error: null });
      supabase.auth.updateUser.mockResolvedValue({ error: null });

      const result = await resetPasswordConfirm('test@example.com', '123456', 'newpass');

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'recovery',
      });
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpass',
      });
      expect(result.success).toBe(true);
    });

    test('Should fail if verification fails', async () => {
      supabase.auth.verifyOtp.mockResolvedValue({ error: { message: 'Invalid token' } });
      const result = await resetPasswordConfirm('test@example.com', '000', 'newpass');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });
  // ================== end resetPasswordConfirm Test ====================

  //================= signUpVerifyAndSetInfo Test========================
  describe('signUpVerifyAndSetInfo', () => {
    test('Should set password and update user info after OTP verification', async () => {
      const email = 'user@example.com';
      const otp = '999999';
      const password = 'newpassword';
      const nickname = 'NewUser';
      const userId = 'user-123';

      // mock verifyOtp response
      supabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      // mock updateUser
      supabase.auth.updateUser.mockResolvedValue({ error: null });
      // mock database update
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ update: mockUpdate });

      // call the backend function
      const result = await signUpVerifyAndSetInfo({
        email,
        otp,
        password,
        nickname,
      });

      //assert the expected result
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email,
        token: otp,
        type: 'email',
      });
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: password,
      });
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith({ nickname: nickname });
      expect(mockEq).toHaveBeenCalledWith('id', userId);
      expect(result.success).toBe(true);
    });

    test('Stop and return error when OTP is invalid', async () => {
      supabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid OTP' },
      });

      const result = await signUpVerifyAndSetInfo({
        email: 'a@a.com',
        otp: '000',
        password: 'p',
        nickname: 'n',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid OTP');
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });
  //================= end signUpVerifyAndSetInfo Test========================

  //================= signOut Test========================
  describe('signOut', () => {
    test('Should call supabase.auth.signOut', async () => {
      supabase.auth.signOut.mockResolvedValue({ error: null });
      await signOut();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
  //================= end signOut Test========================
});
