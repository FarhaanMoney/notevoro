'use client';

import { useState } from 'react';
import { 
  Search, Share, Download, Maximize2, ChevronRight,
  MoreVertical, Settings
} from 'lucide-react';

interface WorkspaceTopBarProps {
  workspaceName?: string;
  featureName: string;
  onSearch?: (query: string) => void;
  onShare?: () => void;
  onDownload?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  showSearch?: boolean;
  showShare?: boolean;
  showDownload?: boolean;
  showExport?: boolean;
  showFullscreen?: boolean;
}

export default function WorkspaceTopBar({
  workspaceName,
  featureName,
  onSearch,
  onShare,
  onDownload,
  onExport,
  onFullscreen,
  showSearch = true,
  showShare = true,
  showDownload = true,
  showExport = true,
  showFullscreen = true,
}: WorkspaceTopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2">
          {workspaceName && (
            <>
              <span className="text-sm font-medium text-gray-600">{workspaceName}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </>
          )}
          <span className="text-sm font-semibold text-gray-900">{featureName}</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64 h-9 border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {showShare && (
            <button
              onClick={onShare}
              className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              <Share className="h-4 w-4" />
            </button>
          )}

          {showDownload && (
            <button
              onClick={onDownload}
              className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
          )}

          {showExport && (
            <button
              onClick={onExport}
              className="h-9 px-4 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Export
            </button>
          )}

          {showFullscreen && (
            <button
              onClick={onFullscreen}
              className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}

          <button className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>

          <button className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
