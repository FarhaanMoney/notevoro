'use client';

import { useState } from 'react';
import { Search, Folder, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LocationStep({ selectedLocation, onLocationSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  // Mock study sets data - in production, fetch from API
  const studySets = [
    { id: 1, name: 'Biology Study Set', itemCount: 24, lastUpdated: '2 days ago' },
    { id: 2, name: 'Mathematics Fundamentals', itemCount: 18, lastUpdated: '1 week ago' },
    { id: 3, name: 'World History', itemCount: 32, lastUpdated: '3 days ago' },
    { id: 4, name: 'Physics Concepts', itemCount: 15, lastUpdated: '5 days ago' },
    { id: 5, name: 'Chemistry Basics', itemCount: 21, lastUpdated: '1 day ago' },
  ];

  const filteredSets = studySets.filter(set =>
    set.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    if (option === 'individual') {
      onLocationSelect({ type: 'individual' });
    }
  };

  const handleStudySetSelect = (studySet) => {
    setSelectedOption('studySet');
    onLocationSelect({ type: 'studySet', studySet });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Where would you like to create this?</h2>
        <p className="text-gray-500">Choose where to organize your new content</p>
      </div>

      {/* Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create inside Study Set */}
        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            selectedOption === 'studySet' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-gray-200'
          }`}
          onClick={() => handleOptionSelect('studySet')}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Folder className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Create inside a Study Set</h3>
              <p className="text-sm text-gray-500">Organize with related content</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </Card>

        {/* Create individually */}
        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            selectedOption === 'individual' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-gray-200'
          }`}
          onClick={() => handleOptionSelect('individual')}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Folder className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Create individually</h3>
              <p className="text-sm text-gray-500">Content exists independently</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Study Set Selection (shown when Study Set option is selected) */}
      {selectedOption === 'studySet' && (
        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search study sets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSets.map((set) => (
              <Card
                key={set.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedLocation?.studySet?.id === set.id ? 'ring-2 ring-purple-500 border-purple-500' : 'border-gray-200'
                }`}
                onClick={() => handleStudySetSelect(set)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">{set.name}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{set.itemCount} items</span>
                      <span>•</span>
                      <span>Updated {set.lastUpdated}</span>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                    <Folder className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
