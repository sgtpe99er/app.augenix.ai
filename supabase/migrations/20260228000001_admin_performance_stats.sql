-- Create a function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_users INTEGER;
  active_websites INTEGER;
  pending_assets INTEGER;
  pending_edits INTEGER;
  monthly_revenue DECIMAL;
  new_users_this_week INTEGER;
  start_of_month TIMESTAMP;
  one_week_ago TIMESTAMP;
BEGIN
  -- Set date thresholds
  start_of_month := date_trunc('month', CURRENT_DATE);
  one_week_ago := CURRENT_DATE - INTERVAL '7 days';
  
  -- Get total users from auth.users (approximate count)
  -- Note: This is an approximation since we can't directly query auth.users in SQL
  SELECT COUNT(*) INTO total_users 
  FROM businesses;
  
  -- Get active websites
  SELECT COUNT(*) INTO active_websites
  FROM businesses
  WHERE status = 'active';
  
  -- Get pending assets
  SELECT COUNT(*) INTO pending_assets
  FROM generated_assets
  WHERE status IN ('pending', 'generating');
  
  -- Get pending edit requests
  SELECT COUNT(*) INTO pending_edits
  FROM edit_requests
  WHERE status = 'pending';
  
  -- Get monthly revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO monthly_revenue
  FROM hosting_payments
  WHERE status = 'paid' 
  AND created_at >= start_of_month;
  
  -- Get new users this week
  SELECT COUNT(*) INTO new_users_this_week
  FROM businesses
  WHERE created_at >= one_week_ago;
  
  -- Build result JSON
  result := json_build_object(
    'totalUsers', total_users,
    'activeWebsites', active_websites,
    'pendingAssets', pending_assets,
    'pendingEdits', pending_edits,
    'monthlyRevenue', monthly_revenue,
    'newUsersThisWeek', new_users_this_week
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
