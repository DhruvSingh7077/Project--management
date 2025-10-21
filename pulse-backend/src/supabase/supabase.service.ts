import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  public readonly client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
}
