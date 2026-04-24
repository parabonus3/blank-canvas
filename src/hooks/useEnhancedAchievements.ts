 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { 
   calculateTreeLevel, 
   getCurrentPhase, 
   getNextLevelProgress,
   getPhaseProgress,
   YEARLY_GOAL_HOURS,
   MAX_LEVELS,
   HOURS_PER_LEVEL
 } from "@/lib/treeConfig";
 import { startOfDay, endOfDay, format, startOfYear, endOfYear, eachDayOfInterval } from "date-fns";
 
 // Enhanced annual progress with level system
 export function useEnhancedAnnualProgress() {
   const { user } = useAuth();
   const currentYear = new Date().getFullYear();
 
   return useQuery({
     queryKey: ['enhancedAnnualProgress', user?.id, currentYear],
     queryFn: async () => {
       if (!user) return null;
 
       const yearStart = new Date(currentYear, 0, 1).toISOString();
       const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
 
       const { data: entries, error } = await supabase
         .from('time_entries')
         .select('duration')
         .eq('user_id', user.id)
         .gte('start_time', yearStart)
         .lte('start_time', yearEnd)
         .not('duration', 'is', null)
         .not('end_time', 'is', null);
 
       if (error) throw error;
 
       const totalSeconds = entries?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0;
       const totalHours = totalSeconds / 3600;
       
       const level = calculateTreeLevel(totalHours);
       const phase = getCurrentPhase(level);
       const nextLevelProgress = getNextLevelProgress(totalHours);
       const phaseProgress = getPhaseProgress(level);
       const overallProgress = Math.min((totalHours / YEARLY_GOAL_HOURS) * 100, 100);
 
       return {
         totalSeconds,
         totalHours,
         level,
         phase,
         phaseName: phase.name,
         phaseProgress,
         nextLevelProgress,
         overallProgress,
         yearlyGoal: YEARLY_GOAL_HOURS,
         maxLevels: MAX_LEVELS,
         hoursPerLevel: HOURS_PER_LEVEL,
         year: currentYear
       };
     },
     enabled: !!user
   });
 }
 
 // Today's hours
 export function useTodayHours() {
   const { user } = useAuth();
   const today = new Date();
 
   return useQuery({
     queryKey: ['todayHours', user?.id, format(today, 'yyyy-MM-dd')],
     queryFn: async () => {
       if (!user) return 0;
 
       const dayStart = startOfDay(today).toISOString();
       const dayEnd = endOfDay(today).toISOString();
 
       const { data: entries, error } = await supabase
         .from('time_entries')
         .select('duration')
         .eq('user_id', user.id)
         .gte('start_time', dayStart)
         .lte('start_time', dayEnd)
         .not('duration', 'is', null)
         .not('end_time', 'is', null);
 
       if (error) throw error;
 
       const totalSeconds = entries?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0;
       return totalSeconds / 3600;
     },
     enabled: !!user,
     refetchInterval: 60000 // Refetch every minute
   });
 }
 
 // Daily data for calendar
 export function useDailyData() {
   const { user } = useAuth();
   const currentYear = new Date().getFullYear();
 
   return useQuery({
     queryKey: ['dailyData', user?.id, currentYear],
     queryFn: async () => {
       if (!user) return [];
 
       const yearStart = startOfYear(new Date(currentYear, 0, 1)).toISOString();
       const yearEnd = endOfYear(new Date(currentYear, 11, 31)).toISOString();
 
       const { data: entries, error } = await supabase
         .from('time_entries')
         .select('duration, start_time')
         .eq('user_id', user.id)
         .gte('start_time', yearStart)
         .lte('start_time', yearEnd)
         .not('duration', 'is', null)
         .not('end_time', 'is', null);
 
       if (error) throw error;
 
       // Group by day
       const dailyMap = new Map<string, number>();
       
       entries?.forEach(entry => {
         const dateStr = format(new Date(entry.start_time), 'yyyy-MM-dd');
         const currentHours = dailyMap.get(dateStr) || 0;
         dailyMap.set(dateStr, currentHours + (entry.duration || 0) / 3600);
       });
 
       return Array.from(dailyMap.entries()).map(([date, hours]) => ({
         date,
         hours
       }));
     },
     enabled: !!user
   });
 }
 
 // Monthly breakdown for chart
 export function useEnhancedMonthlyBreakdown() {
   const { user } = useAuth();
   const currentYear = new Date().getFullYear();
 
   return useQuery({
     queryKey: ['enhancedMonthlyBreakdown', user?.id, currentYear],
     queryFn: async () => {
       if (!user) return [];
 
       const yearStart = new Date(currentYear, 0, 1).toISOString();
       const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
 
       const { data: entries, error } = await supabase
         .from('time_entries')
         .select('duration, start_time')
         .eq('user_id', user.id)
         .gte('start_time', yearStart)
         .lte('start_time', yearEnd)
         .not('duration', 'is', null)
         .not('end_time', 'is', null);
 
       if (error) throw error;
 
       // Group by month
       const monthlyData = Array(12).fill(0);
       entries?.forEach(entry => {
         const month = new Date(entry.start_time).getMonth();
         monthlyData[month] += entry.duration || 0;
       });
 
       const monthNames = [
         'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
         'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
       ];
 
       // Calculate target per month (1100h / 12 = ~91.67h)
       const targetPerMonth = YEARLY_GOAL_HOURS / 12;
 
       return monthlyData.map((seconds, index) => ({
         month: monthNames[index],
         hours: +(seconds / 3600).toFixed(1),
         target: Math.round(targetPerMonth)
       }));
     },
     enabled: !!user
   });
 }