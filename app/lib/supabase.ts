import { createClient } from '@supabase/supabase-js';

// Supabase client for server components
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and Anon Key are required');
  }

  return createClient(url, key);
};

// Supabase client for client components
export const createBrowserClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and Anon Key are required');
  }

  return createClient(url, key);
};

// Define the database schema types
export type User = {
  id: string;
  email: string;
  subscription_status: string;
};

export type Business = {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  address?: string;
  gmb_location_id?: string;
  facebook_page_id?: string;
  place_id?: string;
};

export type ActionLog = {
  id: string;
  business_id: string;
  action: string;
  timestamp: string;
};

export type Metric = {
  id: string;
  business_id: string;
  metric_name: string;
  value: string;
};

// CRUD operations for users
export const userOperations = {
  async getUser(userId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data as User;
  },
  
  async updateUser(userId: string, updates: Partial<User>) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data as User;
  }
};

// CRUD operations for businesses
export const businessOperations = {
  async getBusinesses(userId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data as Business[];
  },
  
  async getBusiness(businessId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (error) throw error;
    return data as Business;
  },
  
  async createBusiness(business: Omit<Business, 'id'>) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .insert(business)
      .select()
      .single();
    
    if (error) throw error;
    return data as Business;
  },
  
  async updateBusiness(businessId: string, updates: Partial<Business>) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', businessId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Business;
  },
  
  async deleteBusiness(businessId: string) {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);
    
    if (error) throw error;
    return true;
  }
};

// Operations for action logs
export const actionLogOperations = {
  async logAction(action: Omit<ActionLog, 'id' | 'timestamp'>) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('actions_log')
      .insert(action)
      .select()
      .single();
    
    if (error) throw error;
    return data as ActionLog;
  },
  
  async getBusinessActions(businessId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('actions_log')
      .select('*')
      .eq('business_id', businessId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data as ActionLog[];
  }
};

// Operations for metrics
export const metricOperations = {
  async recordMetric(metric: Omit<Metric, 'id'>) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('metrics')
      .insert(metric)
      .select()
      .single();
    
    if (error) throw error;
    return data as Metric;
  },
  
  async getBusinessMetrics(businessId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('business_id', businessId);
    
    if (error) throw error;
    return data as Metric[];
  }
}; 