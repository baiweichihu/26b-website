import {
  signIn,
  sendRegisterOtp,
  sendLoginOtp,
  sendPasswordResetOtp,
  signUpVerifyAndSetInfo,
  signOut,
  resetPasswordConfirm,
  submitGuestIdentityUpgradeRequest,
} from '../userService';
import { generateIdenticonAvatarUrl } from '../../utils/avatarUtils';
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
      getUser: jest.fn(),
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
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ select: mockSelect });
      supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
      // call the backend function
      const result = await sendRegisterOtp('new@example.com');
      // assert the expected result
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('id');
      expect(mockEq).toHaveBeenCalledWith('email', 'new@example.com');
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'new@example.com',
        options: {
          shouldCreateUser: true,
          data: {},
        },
      });
      expect(result.success).toBe(true);
    });

    test('Should return error when account already exists', async () => {
      const mockLimit = jest.fn().mockResolvedValue({ data: [{ id: 'user-1' }], error: null });
      const mockEq = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await sendRegisterOtp('existing@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account already exists. Please log in.');
      expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
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
      const expectedAvatarUrl = generateIdenticonAvatarUrl(userId);

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
      expect(mockUpdate).toHaveBeenCalledWith({
        nickname: nickname,
        avatar_url: expectedAvatarUrl,
      });
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

  //================= submitGuestIdentityUpgradeRequest Test========================
  describe('submitGuestIdentityUpgradeRequest', () => {
    test('Should insert admin request for identity upgrade', async () => {
      const mockUser = { id: 'user-777' };
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      supabase.from.mockReturnValue({ insert: mockInsert });

      const result = await submitGuestIdentityUpgradeRequest({
        evidence: 'Class of 2010, Section B',
        nickname: 'Alex',
      });

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('admin_requests');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          requester_id: mockUser.id,
          request_type: 'upgrade_identity',
          status: 'pending',
        })
      );
      expect(result.success).toBe(true);
    });

    test('Should return error when user is not signed in', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await submitGuestIdentityUpgradeRequest({
        evidence: 'Class of 2010',
        nickname: null,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('You are not signed in.');
    });
  });
  //================= end submitGuestIdentityUpgradeRequest Test========================
});
