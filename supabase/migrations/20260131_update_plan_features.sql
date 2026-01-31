-- 更新 enterprise 套餐的 features
UPDATE plan_configs
SET features = '["每日 100 次翻译", "极速通道", "专属客服", "优先体验新功能"]'::jsonb
WHERE plan_name = 'enterprise';

-- 更新 pro 套餐的 features
UPDATE plan_configs
SET features = '["每日 50 次翻译", "优先处理", "无广告", "邮件支持"]'::jsonb
WHERE plan_name = 'pro';

-- 更新 free 套餐的 features
UPDATE plan_configs
SET features = '["每日 20 次翻译", "基础翻译引擎", "社区支持"]'::jsonb
WHERE plan_name = 'free';
