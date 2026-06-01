'use client';

import { 
  FileText, BookOpen, ClipboardList, Clock, TrendingUp, 
  Target, Zap, Award, BarChart3
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

function StatCard({ title, value, icon, trend, color = 'purple' }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    pink: 'bg-pink-50 text-pink-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface FeatureDashboardProps {
  featureType: 'notes' | 'flashcards' | 'quizzes' | 'mock-tests' | 'study-plan' | 'visual-learning';
  stats: {
    totalItems?: number;
    createdThisWeek?: number;
    completionRate?: number;
    averageScore?: number;
    studyTime?: string;
    aiActivity?: number;
    masteredCards?: number;
    learningCards?: number;
    retentionRate?: number;
    bestScore?: number;
    totalQuestions?: number;
    tasksCompleted?: number;
    streak?: number;
  };
}

export default function FeatureDashboard({ featureType, stats }: FeatureDashboardProps) {
  const getStatsForFeature = () => {
    switch (featureType) {
      case 'notes':
        return [
          {
            title: 'Total Notes',
            value: stats.totalItems || 0,
            icon: <FileText className="h-5 w-5" />,
            trend: stats.createdThisWeek ? `+${stats.createdThisWeek} this week` : undefined,
            color: 'purple',
          },
          {
            title: 'Study Time',
            value: stats.studyTime || '0h',
            icon: <Clock className="h-5 w-5" />,
            color: 'blue',
          },
          {
            title: 'AI Activity',
            value: stats.aiActivity || 0,
            icon: <Zap className="h-5 w-5" />,
            color: 'orange',
          },
        ];

      case 'flashcards':
        return [
          {
            title: 'Total Sets',
            value: stats.totalItems || 0,
            icon: <BookOpen className="h-5 w-5" />,
            trend: stats.createdThisWeek ? `+${stats.createdThisWeek} this week` : undefined,
            color: 'purple',
          },
          {
            title: 'Mastered',
            value: stats.masteredCards || 0,
            icon: <Award className="h-5 w-5" />,
            color: 'green',
          },
          {
            title: 'Learning',
            value: stats.learningCards || 0,
            icon: <Target className="h-5 w-5" />,
            color: 'blue',
          },
          {
            title: 'Retention',
            value: `${stats.retentionRate || 0}%`,
            icon: <TrendingUp className="h-5 w-5" />,
            color: 'orange',
          },
        ];

      case 'quizzes':
        return [
          {
            title: 'Total Quizzes',
            value: stats.totalItems || 0,
            icon: <ClipboardList className="h-5 w-5" />,
            trend: stats.createdThisWeek ? `+${stats.createdThisWeek} this week` : undefined,
            color: 'purple',
          },
          {
            title: 'Average Score',
            value: `${stats.averageScore || 0}%`,
            icon: <BarChart3 className="h-5 w-5" />,
            color: 'blue',
          },
          {
            title: 'Best Score',
            value: `${stats.bestScore || 0}%`,
            icon: <Award className="h-5 w-5" />,
            color: 'green',
          },
          {
            title: 'Questions',
            value: stats.totalQuestions || 0,
            icon: <Target className="h-5 w-5" />,
            color: 'orange',
          },
        ];

      case 'mock-tests':
        return [
          {
            title: 'Total Tests',
            value: stats.totalItems || 0,
            icon: <ClipboardList className="h-5 w-5" />,
            trend: stats.createdThisWeek ? `+${stats.createdThisWeek} this week` : undefined,
            color: 'purple',
          },
          {
            title: 'Average Score',
            value: `${stats.averageScore || 0}%`,
            icon: <BarChart3 className="h-5 w-5" />,
            color: 'blue',
          },
          {
            title: 'Best Score',
            value: `${stats.bestScore || 0}%`,
            icon: <Award className="h-5 w-5" />,
            color: 'green',
          },
          {
            title: 'Completion',
            value: `${stats.completionRate || 0}%`,
            icon: <Target className="h-5 w-5" />,
            color: 'orange',
          },
        ];

      case 'study-plan':
        return [
          {
            title: 'Tasks Completed',
            value: stats.tasksCompleted || 0,
            icon: <Target className="h-5 w-5" />,
            color: 'green',
          },
          {
            title: 'Study Streak',
            value: `${stats.streak || 0} days`,
            icon: <Zap className="h-5 w-5" />,
            color: 'orange',
          },
          {
            title: 'Completion Rate',
            value: `${stats.completionRate || 0}%`,
            icon: <TrendingUp className="h-5 w-5" />,
            color: 'blue',
          },
        ];

      case 'visual-learning':
        return [
          {
            title: 'Total Diagrams',
            value: stats.totalItems || 0,
            icon: <FileText className="h-5 w-5" />,
            trend: stats.createdThisWeek ? `+${stats.createdThisWeek} this week` : undefined,
            color: 'purple',
          },
          {
            title: 'AI Activity',
            value: stats.aiActivity || 0,
            icon: <Zap className="h-5 w-5" />,
            color: 'orange',
          },
        ];

      default:
        return [];
    }
  };

  const featureStats = getStatsForFeature();

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}
