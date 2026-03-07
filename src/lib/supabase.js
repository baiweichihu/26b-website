
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://frvlwqxbnpzwkvrawewe.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_k5rFSf8btQn8u6WLNAUgDQ_APxRcQFi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
