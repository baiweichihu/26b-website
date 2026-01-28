// src/services/test/inboxService.test.js

import {
  createWelcomeNotification,
  createAuditResultNotification,
  createReportFeedbackNotification,
  createInteractionNotification,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../inboxService.js';

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.log.mockRestore();
});

// 创建支持链式调用的 mock 查询构建器
const createMockQueryBuilder = (mockData = null, mockError = null) => {
  const resolveValue = { data: mockData, error: mockError };
  
  return {
    select: jest.fn().mockImplementation(function() {
      return this;
    }),
    insert: jest.fn().mockImplementation(function() {
      return this;
    }),
    update: jest.fn().mockImplementation(function() {
      return this;
    }),
    eq: jest.fn().mockImplementation(function() {
      return this;
    }),
    in: jest.fn().mockImplementation(function() {
      return this;
    }),
    order: jest.fn().mockImplementation(function() {
      return this;
    }),
    or: jest.fn().mockImplementation(function() {
      return this;
    }),
    single: jest.fn().mockResolvedValue(resolveValue),
    limit: jest.fn().mockImplementation(function() {
      return this;
    }),
    then: jest.fn((resolve) => resolve(resolveValue)),
  };
};

// Mock supabase客户端
jest.mock('../../lib/supabase.js', () => {
  const mockChannel = {
    on: jest.fn(function() {
      return this;
    }),
    subscribe: jest.fn(function(callback) {
      if (callback) callback('SUBSCRIBED');
      return this;
    }),
    unsubscribe: jest.fn(() => Promise.resolve()),
  };

  return {
    supabase: {
      from: jest.fn(() => createMockQueryBuilder()),
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn(() => Promise.resolve()),
    },
  };
});

import { supabase } from '../../lib/supabase.js';

// 测试数据
const mockUsers = {
  classmate: {
    id: 'user-classmate-123',
    nickname: '同学张三'
  },
  alumni: {
    id: 'user-alumni-456',
    nickname: '校友李四'
  },
  admin: {
    id: 'user-admin-101',
    nickname: '管理员赵六'
  }
};

describe('InboxService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('创建通知函数', () => {
    test('成功创建欢迎通知', async () => {
      const mockNotification = {
        id: 'notification-welcome-1',
        recipient_id: mockUsers.classmate.id,
        type: 'system_announcement',
        title: '标题',
        content: '这是一个welcomenotification',
        is_read: false
      };

      const mockBuilder = createMockQueryBuilder([mockNotification]);
      supabase.from.mockReturnValueOnce(mockBuilder);

      const result = await createWelcomeNotification(mockUsers.classmate.id);

      expect(result.data).toEqual([mockNotification]);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    test('成功创建审核结果通知', async () => {
      const mockNotification = {
        id: 'notification-audit-1',
        recipient_id: mockUsers.classmate.id,
        type: 'audit_result',
        title: '申请已批准',
        is_read: false
      };

      const mockBuilder = createMockQueryBuilder([mockNotification]);
      supabase.from.mockReturnValueOnce(mockBuilder);

      const result = await createAuditResultNotification(
        mockUsers.classmate.id,
        'approved',
        '升级校友',
        'request-123'
      );

      expect(result.data).toEqual([mockNotification]);
    });

    test('成功创建举报反馈通知', async () => {
      const mockNotification = {
        id: 'notification-report-1',
        type: 'report_feedback',
        title: '举报已处理'
      };

      const mockBuilder = createMockQueryBuilder([mockNotification]);
      supabase.from.mockReturnValueOnce(mockBuilder);

      const result = await createReportFeedbackNotification(
        mockUsers.classmate.id,
        'resolved',
        'post'
      );

      expect(result.data).toEqual([mockNotification]);
    });

    test('成功创建互动通知', async () => {
      const mockNotification = {
        id: 'notification-interaction-1',
        type: 'interaction',
        title: `${mockUsers.alumni.nickname}点赞了你的帖子`
      };

      const mockBuilder = createMockQueryBuilder([mockNotification]);
      supabase.from.mockReturnValueOnce(mockBuilder);

      const result = await createInteractionNotification(
        mockUsers.classmate.id,
        'like',
        mockUsers.alumni.nickname,
        'post',
        'post-123'
      );

      expect(result.data).toEqual([mockNotification]);
    });
  });

  describe('实时订阅（WebSocket）', () => {
    test('成功订阅用户的实时通知', async () => {
      const mockCallback = jest.fn();
      const result = await subscribeToNotifications(mockUsers.classmate.id, mockCallback);

      expect(result.channel).toBeDefined();
      expect(result.error).toBeNull();
      expect(supabase.channel).toHaveBeenCalledWith(`notifications:${mockUsers.classmate.id}`);
    });

    test('缺少 userId 时订阅失败', async () => {
      const mockCallback = jest.fn();
      const result = await subscribeToNotifications(null, mockCallback);

      expect(result.channel).toBeNull();
      expect(result.error).toBeDefined();
    });

    test('缺少回调函数时订阅失败', async () => {
      const result = await subscribeToNotifications(mockUsers.classmate.id, null);

      expect(result.channel).toBeNull();
      expect(result.error).toBeDefined();
    });

    test('处理 Realtime 事件 - INSERT 新通知', async () => {
      const mockCallback = jest.fn();
      let capturedInsertCallback = null;

      supabase.channel().on.mockImplementation(function(event, config, callback) {
        if (event === 'postgres_changes' && config.event === 'INSERT') {
          capturedInsertCallback = callback;
        }
        return this;
      });

      await subscribeToNotifications(mockUsers.classmate.id, mockCallback);

      // 模拟新通知到达
      if (capturedInsertCallback) {
        capturedInsertCallback({
          new: {
            id: 'new-notif-1',
            recipient_id: mockUsers.classmate.id,
            type: 'interaction',
            title: '新点赞'
          }
        });

        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'INSERT',
            data: expect.objectContaining({
              id: 'new-notif-1'
            })
          })
        );
      }
    });

    test('处理 Realtime 事件 - UPDATE 通知状态', async () => {
      const mockCallback = jest.fn();
      let capturedUpdateCallback = null;

      supabase.channel().on.mockImplementation(function(event, config, callback) {
        if (event === 'postgres_changes' && config.event === 'UPDATE') {
          capturedUpdateCallback = callback;
        }
        return this;
      });

      await subscribeToNotifications(mockUsers.classmate.id, mockCallback);

      // 模拟通知被标记为已读
      if (capturedUpdateCallback) {
        capturedUpdateCallback({
          new: {
            id: 'notif-1',
            is_read: true
          }
        });

        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'UPDATE',
            data: expect.objectContaining({
              id: 'notif-1',
              is_read: true
            })
          })
        );
      }
    });
  });

  describe('取消订阅', () => {
    test('成功取消订阅', async () => {
      const mockCallback = jest.fn();
      await subscribeToNotifications(mockUsers.classmate.id, mockCallback);

      const result = await unsubscribeFromNotifications(mockUsers.classmate.id);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(supabase.removeChannel).toHaveBeenCalled();
    });

    test('取消不存在的订阅失败', async () => {
      const result = await unsubscribeFromNotifications('non-existent-user');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('通知管理', () => {
    test('成功获取未读通知', async () => {
      const mockUnreadNotifs = [
        {
          id: 'notif-1',
          recipient_id: mockUsers.classmate.id,
          is_read: false
        }
      ];

      const mockBuilder = createMockQueryBuilder(mockUnreadNotifs);
      supabase.from.mockReturnValueOnce(mockBuilder);

      const result = await getUnreadNotifications(mockUsers.classmate.id);

      expect(result.data).toEqual(mockUnreadNotifs);
      expect(mockBuilder.eq).toHaveBeenCalledWith('recipient_id', mockUsers.classmate.id);
      expect(mockBuilder.eq).toHaveBeenCalledWith('is_read', false);
    });

    test('成功标记单个通知为已读', async () => {
      const mockUpdatedNotif = {
        id: 'notif-1',
        is_read: true
      };

      const mockBuilder = createMockQueryBuilder([mockUpdatedNotif]);
      supabase.from.mockReturnValueOnce(mockBuilder);

      const result = await markNotificationAsRead('notif-1');

      expect(result.data).toEqual([mockUpdatedNotif]);
      expect(mockBuilder.update).toHaveBeenCalledWith({ is_read: true });
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'notif-1');
    });

    test('成功标记所有通知为已读', async () => {
      const mockBuilder = createMockQueryBuilder([
        { id: 'notif-1', is_read: true },
        { id: 'notif-2', is_read: true }
      ]);
      supabase.from.mockReturnValueOnce(mockBuilder);

      const result = await markAllNotificationsAsRead(mockUsers.classmate.id);

      expect(result.data).toHaveLength(2);
      expect(mockBuilder.update).toHaveBeenCalledWith({ is_read: true });
      expect(mockBuilder.eq).toHaveBeenCalledWith('recipient_id', mockUsers.classmate.id);
    });
  });

  describe('集成测试', () => {
    test('完整流程：创建、订阅、接收实时通知', async () => {
      // 1. 创建通知
      const newNotif = {
        id: 'notif-full-1',
        recipient_id: mockUsers.classmate.id,
        type: 'interaction'
      };

      const createBuilder = createMockQueryBuilder([newNotif]);
      supabase.from.mockReturnValueOnce(createBuilder);

      const createResult = await createInteractionNotification(
        mockUsers.classmate.id,
        'like',
        mockUsers.alumni.nickname,
        'post',
        'post-999'
      );

      expect(createResult.data).toEqual([newNotif]);

      // 2. 订阅通知
      const mockCallback = jest.fn();
      const subResult = await subscribeToNotifications(mockUsers.classmate.id, mockCallback);

      expect(subResult.channel).toBeDefined();
      expect(supabase.channel).toHaveBeenCalled();
    });

    test('多用户独立订阅', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const result1 = await subscribeToNotifications(mockUsers.classmate.id, callback1);
      
      jest.clearAllMocks();
      
      const result2 = await subscribeToNotifications(mockUsers.alumni.id, callback2);

      expect(result1.error).toBeNull();
      expect(result2.error).toBeNull();
    });
  });
});
