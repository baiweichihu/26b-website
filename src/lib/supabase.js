
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://frvlwqxbnpzwkvrawewe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_k5rFSf8btQn8u6WLNAUgDQ_APxRcQFi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
