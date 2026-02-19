
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://frvlwqxbnpzwkvrawewe.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_k5rFSf8btQn8u6WLNAUgDQ_APxRcQFi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
