import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 1. 验证签名
    const rawBody = await req.text();
    const hmac = req.headers.get('x-signature');
    
    if (!verifySignature(rawBody, hmac, webhookSecret)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { meta, data } = payload;
    const eventName = meta.event_name;
    const customData = meta.custom_data || {};
    const userId = customData.user_id;

    console.log(`Received event: ${eventName}, user_id: ${userId}`);

    if (!userId) {
      console.warn('No user_id in custom_data, skipping');
      return new Response('No user_id provided', { status: 200 });
    }

    // 2. 处理订阅事件
    if (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'subscription_resumed') {
      const attributes = data.attributes;
      const variantId = attributes.variant_id.toString();
      const customerId = attributes.customer_id.toString();
      const status = attributes.status; // active, past_due, etc.
      const renewsAt = attributes.renews_at;

      // 查找对应的套餐
      // 注意：这里我们查询 plan_configs 表来找到匹配的 variant_id
      // 如果是月付或年付，我们都映射到同一个 plan
      const { data: planConfig, error: planError } = await supabase
        .from('plan_configs')
        .select('*')
        .or(`lemon_variant_id_monthly.eq.${variantId},lemon_variant_id_yearly.eq.${variantId}`)
        .single();

      if (planError || !planConfig) {
        console.error('Plan not found for variant:', variantId);
        return new Response('Plan not found', { status: 400 });
      }

      // 更新用户 Profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          plan: planConfig.plan_name,
          daily_limit: planConfig.daily_limit,
          subscription_id: data.id,
          customer_id: customerId,
          variant_id: variantId,
          status: status,
          renews_at: renewsAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update profile:', updateError);
        throw updateError;
      }
    } 
    // 3. 处理过期/取消事件
    else if (eventName === 'subscription_expired') {
      // 降级为 free
      const { error } = await supabase
        .from('user_profiles')
        .update({
          plan: 'free',
          daily_limit: 20, // 硬编码或再次查询 free plan
          status: 'expired',
          renews_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (error) console.error('Failed to downgrade user:', error);
    }
    else if (eventName === 'subscription_cancelled') {
      // 仅更新状态，直到有效期结束才真正过期（由 LS 的 expired 事件触发）
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: 'cancelled' })
        .eq('id', userId);
        
      if (error) console.error('Failed to update cancelled status:', error);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

// 验证 HMAC 签名
async function verifySignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuf,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const payloadBuf = encoder.encode(payload);
  const signatureBuf = hexToBuf(signature);
  
  return await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBuf,
    payloadBuf
  );
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
