#!/usr/bin/env ts-node

/**
 * Script to add comprehensive data-testid attributes to UI components
 * Following UAT testing standards from .asif/Design-System/UI/data-testid-prompt.md
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComponentUpdate {
  file: string;
  updates: Array<{
    search: RegExp | string;
    replace: string;
  }>;
}

const componentUpdates: ComponentUpdate[] = [
  // YoloMode Component
  {
    file: 'src/components/YoloMode.tsx',
    updates: [
      { search: '<div className="min-h-screen', replace: '<div className="min-h-screen" data-testid="yolo-container"' },
      { search: '<div className="max-w-6xl', replace: '<div className="max-w-6xl" data-testid="yolo-main"' },
      { search: '<h1 className="text-5xl', replace: '<h1 className="text-5xl" data-testid="yolo-title"' },
      { search: /<button[\s\S]*?onClick=\{.*?toggleYolo.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="yolo-toggle-btn"') },
      { search: /<select[\s\S]*?value=\{.*?level.*?\}/g, replace: (match: string) => match.replace('<select', '<select data-testid="yolo-level-select"') },
      { search: /<button[\s\S]*?onClick=\{.*?executeAction.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="yolo-execute-btn"') },
      { search: 'className="space-y-3">', replace: 'className="space-y-3" data-testid="yolo-actions-list">' }
    ]
  },

  // VisionDisplay Component
  {
    file: 'src/components/VisionDisplay.tsx',
    updates: [
      { search: '<div className="p-6', replace: '<div className="p-6" data-testid="vision-display-container"' },
      { search: '<h2 className="text-2xl', replace: '<h2 className="text-2xl" data-testid="vision-display-title"' },
      { search: '<p className="text-gray-300', replace: '<p className="text-gray-300" data-testid="vision-display-mission"' },
      { search: 'className="grid grid-cols', replace: 'className="grid grid-cols" data-testid="vision-display-metrics"' },
      { search: /<button[\s\S]*?onClick=\{.*?edit.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="vision-display-edit-btn"') }
    ]
  },

  // ArchitectDiscussion Component
  {
    file: 'src/components/ArchitectDiscussion.tsx',
    updates: [
      { search: '<div className="flex flex-col', replace: '<div className="flex flex-col" data-testid="architect-discussion-container"' },
      { search: '<div className="border-b', replace: '<div className="border-b" data-testid="architect-discussion-header"' },
      { search: 'className="flex-1 overflow-y-auto', replace: 'className="flex-1 overflow-y-auto" data-testid="architect-discussion-messages"' },
      { search: /<input[\s\S]*?type="text"/g, replace: (match: string) => match.replace('<input', '<input data-testid="architect-discussion-input"') },
      { search: /<button[\s\S]*?type="submit"/g, replace: (match: string) => match.replace('<button', '<button data-testid="architect-discussion-send-btn"') }
    ]
  },

  // LiveActivityFeed Component
  {
    file: 'src/components/real-time/LiveActivityFeed.tsx',
    updates: [
      { search: '<div className="h-full', replace: '<div className="h-full" data-testid="activity-feed-container"' },
      { search: '<div className="flex items-center', replace: '<div className="flex items-center" data-testid="activity-feed-header"' },
      { search: 'className="space-y-2', replace: 'className="space-y-2" data-testid="activity-feed-list"' },
      { search: /<button[\s\S]*?onClick=\{.*?filter.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="activity-feed-filter-btn"') },
      { search: /<button[\s\S]*?onClick=\{.*?pause.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="activity-feed-pause-btn"') }
    ]
  },

  // AgentCollaborationView Component
  {
    file: 'src/components/real-time/AgentCollaborationView.tsx',
    updates: [
      { search: '<div className="flex flex-col', replace: '<div className="flex flex-col" data-testid="agent-collab-container"' },
      { search: '<div className="grid grid-cols', replace: '<div className="grid grid-cols" data-testid="agent-collab-grid"' },
      { search: 'className="p-4 rounded-lg', replace: 'className="p-4 rounded-lg" data-testid="agent-collab-card"' },
      { search: '<h3 className="font-semibold', replace: '<h3 className="font-semibold" data-testid="agent-collab-name"' },
      { search: /<button[\s\S]*?onClick=\{.*?interact.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="agent-collab-interact-btn"') }
    ]
  },

  // ToastSystem Component
  {
    file: 'src/components/feedback/ToastSystem.tsx',
    updates: [
      { search: '<div className="fixed', replace: '<div className="fixed" data-testid="toast-container"' },
      { search: 'className="space-y-2', replace: 'className="space-y-2" data-testid="toast-list"' },
      { search: 'role="alert"', replace: 'role="alert" data-testid="toast-item"' },
      { search: /<button[\s\S]*?onClick=\{.*?dismiss.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="toast-close-btn"') },
      { search: 'className="toast-message', replace: 'className="toast-message" data-testid="toast-message"' }
    ]
  },

  // ProgressBar Component
  {
    file: 'src/components/ui/ProgressBar.tsx',
    updates: [
      { search: '<div className="w-full', replace: '<div className="w-full" data-testid="progress-bar-container"' },
      { search: 'className="bg-gray-200', replace: 'className="bg-gray-200" data-testid="progress-bar-track"' },
      { search: 'className="bg-blue-500', replace: 'className="bg-blue-500" data-testid="progress-bar-fill"' },
      { search: '<span className="text-sm', replace: '<span className="text-sm" data-testid="progress-bar-label"' },
      { search: '<span className="text-xs', replace: '<span className="text-xs" data-testid="progress-bar-value"' }
    ]
  },

  // Dashboard Live Page
  {
    file: 'src/pages/dashboard-live.tsx',
    updates: [
      { search: '<div className="min-h-screen', replace: '<div className="min-h-screen" data-testid="dashboard-live-container"' },
      { search: '<header className=', replace: '<header className=" data-testid="dashboard-live-header"' },
      { search: '<main className=', replace: '<main className=" data-testid="dashboard-live-main"' },
      { search: '<aside className=', replace: '<aside className=" data-testid="dashboard-live-sidebar"' },
      { search: /<button[\s\S]*?onClick=\{.*?refresh.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="dashboard-live-refresh-btn"') }
    ]
  },

  // Monitoring Dashboard
  {
    file: 'src/monitoring/dashboard.tsx',
    updates: [
      { search: '<div className="dashboard-container', replace: '<div className="dashboard-container" data-testid="monitoring-dashboard-container"' },
      { search: '<div className="grid grid-cols', replace: '<div className="grid grid-cols" data-testid="monitoring-metrics-grid"' },
      { search: 'className="metric-card', replace: 'className="metric-card" data-testid="monitoring-metric-card"' },
      { search: '<h3 className="metric-title', replace: '<h3 className="metric-title" data-testid="monitoring-metric-title"' },
      { search: '<span className="metric-value', replace: '<span className="metric-value" data-testid="monitoring-metric-value"' },
      { search: /<button[\s\S]*?onClick=\{.*?export.*?\}/g, replace: (match: string) => match.replace('<button', '<button data-testid="monitoring-export-btn"') }
    ]
  }
];

// Process each component
function processComponents() {
  console.log('🔧 Adding data-testid attributes to components...\n');

  let totalUpdates = 0;
  const updatedFiles: string[] = [];

  componentUpdates.forEach(({ file, updates }) => {
    const filePath = path.join(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let updateCount = 0;

    updates.forEach(({ search, replace }) => {
      if (typeof search === 'string') {
        if (content.includes(search) && !content.includes(replace)) {
          content = content.replace(search, replace);
          updateCount++;
        }
      } else {
        // RegExp handling
        const matches = content.match(search);
        if (matches && matches.length > 0) {
          if (typeof replace === 'function') {
            content = content.replace(search, replace);
          } else {
            content = content.replace(search, replace);
          }
          updateCount++;
        }
      }
    });

    if (updateCount > 0) {
      fs.writeFileSync(filePath, content);
      updatedFiles.push(file);
      totalUpdates += updateCount;
      console.log(`✅ ${file}: ${updateCount} updates`);
    } else {
      console.log(`ℹ️  ${file}: No updates needed`);
    }
  });

  console.log('\n📊 Summary:');
  console.log(`- Files updated: ${updatedFiles.length}`);
  console.log(`- Total updates: ${totalUpdates}`);

  return { updatedFiles, totalUpdates };
}

// Check for duplicates
function checkDuplicates() {
  console.log('\n🔍 Checking for duplicate data-testid values...\n');

  const testIds = new Map<string, string[]>();
  const files = [
    'src/components/**/*.tsx',
    'src/pages/**/*.tsx',
    'src/monitoring/**/*.tsx'
  ];

  // Simple regex to find data-testid attributes
  const testIdRegex = /data-testid="([^"]+)"/g;

  // Read all files and extract testids
  const globSync = require('glob').sync;
  files.forEach(pattern => {
    globSync(pattern).forEach((file: string) => {
      const content = fs.readFileSync(file, 'utf-8');
      let match;

      while ((match = testIdRegex.exec(content)) !== null) {
        const testId = match[1];
        if (!testIds.has(testId)) {
          testIds.set(testId, []);
        }
        testIds.get(testId)!.push(file);
      }
    });
  });

  // Find duplicates
  const duplicates: { testId: string; files: string[] }[] = [];
  testIds.forEach((fileList, testId) => {
    if (fileList.length > 1) {
      duplicates.push({ testId, files: fileList });
    }
  });

  if (duplicates.length > 0) {
    console.log('⚠️  Duplicate data-testid values found:');
    duplicates.forEach(({ testId, files }) => {
      console.log(`\n  "${testId}" appears in:`);
      files.forEach(file => console.log(`    - ${file}`));
    });
    return false;
  } else {
    console.log('✅ No duplicate data-testid values found!');
    return true;
  }
}

// Main execution
function main() {
  console.log('🚀 NXTG-Forge UAT Testing Attribute Updater\n');
  console.log('====================================\n');

  const { updatedFiles, totalUpdates } = processComponents();
  const noDuplicates = checkDuplicates();

  console.log('\n====================================');
  console.log('✨ Update Complete!\n');

  if (noDuplicates) {
    console.log('🎉 All components updated successfully with unique data-testid attributes');
  } else {
    console.log('⚠️  Please resolve duplicate data-testid values');
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    filesUpdated: updatedFiles,
    totalUpdates,
    duplicatesFound: !noDuplicates,
    status: noDuplicates ? 'SUCCESS' : 'NEEDS_ATTENTION'
  };

  fs.writeFileSync(
    'testid-update-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Report saved to: testid-update-report.json');
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { processComponents, checkDuplicates };