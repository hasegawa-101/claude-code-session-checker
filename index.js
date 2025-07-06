#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const SESSION_DURATION_HOURS = 5;
const MAX_SESSIONS_PER_MONTH = 50;

class SessionTracker {
  constructor() {
    this.sessions = [];
  }

  // JSONLファイルからセッション情報を抽出
  parseSessionFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      if (lines.length === 0) return null;

      // 最初のユーザーメッセージを見つける
      let firstMessage = null;
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'user' && data.timestamp) {
            firstMessage = data;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!firstMessage) return null;

      const sessionId = firstMessage.sessionId;
      const startTime = new Date(firstMessage.timestamp);
      const endTime = new Date(startTime.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

      return {
        sessionId,
        startTime,
        endTime,
        filePath,
        project: this.extractProjectName(filePath)
      };
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error.message);
      return null;
    }
  }

  // プロジェクト名を抽出
  extractProjectName(filePath) {
    const parts = filePath.split(path.sep);
    const projectsIndex = parts.findIndex(part => part === 'projects');
    if (projectsIndex !== -1 && projectsIndex < parts.length - 1) {
      return parts[projectsIndex + 1].replace(/-/g, '/');
    }
    return 'unknown';
  }

  // 全セッションを読み込み
  loadAllSessions() {
    if (!fs.existsSync(PROJECTS_DIR)) {
      throw new Error('Claude projects directory not found');
    }

    const projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(PROJECTS_DIR, dirent.name));

    for (const projectDir of projectDirs) {
      const sessionFiles = fs.readdirSync(projectDir)
        .filter(file => file.endsWith('.jsonl'))
        .map(file => path.join(projectDir, file));

      for (const sessionFile of sessionFiles) {
        const session = this.parseSessionFile(sessionFile);
        if (session) {
          this.sessions.push(session);
        }
      }
    }

    // セッションを開始時刻でソート
    this.sessions.sort((a, b) => a.startTime - b.startTime);
  }

  // 現在の月のセッション数を取得
  getCurrentMonthSessions() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return this.sessions.filter(session => {
      return session.startTime.getMonth() === currentMonth &&
             session.startTime.getFullYear() === currentYear;
    });
  }

  // 現在進行中のセッションを取得
  getCurrentSession() {
    const now = new Date();
    return this.sessions.find(session => {
      return session.startTime <= now && now <= session.endTime;
    });
  }

  // セッション使用量のサマリー表示
  showStatus() {
    const currentMonthSessions = this.getCurrentMonthSessions();
    const currentSession = this.getCurrentSession();
    const now = new Date();

    console.log('🤖 Claude Code セッション使用状況\n');

    // 今月の使用量
    const usedSessions = currentMonthSessions.length;
    const percentage = Math.round((usedSessions / MAX_SESSIONS_PER_MONTH) * 100);
    
    const statusIcon = percentage >= 90 ? '🔴' : percentage >= 70 ? '🟡' : '🟢';
    console.log(`${statusIcon} 今月: ${usedSessions}/${MAX_SESSIONS_PER_MONTH} セッション (${percentage}%)`);

    // 残りセッション数の予測
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;
    
    if (daysRemaining > 0) {
      const dailyRate = usedSessions / daysPassed;
      const predictedTotal = Math.round(dailyRate * daysInMonth);
      const predictedIcon = predictedTotal > MAX_SESSIONS_PER_MONTH ? '⚠️' : '✅';
      console.log(`${predictedIcon} 推定月末到達: ${predictedTotal}セッション (現在ペース: ${dailyRate.toFixed(1)}/日)`);
    }

    // 現在のセッション情報
    if (currentSession) {
      const elapsed = Math.round((now - currentSession.startTime) / (1000 * 60));
      const remaining = Math.round((currentSession.endTime - now) / (1000 * 60));
      console.log(`\n⏱️  現在のセッション: ${Math.floor(elapsed/60)}時間${elapsed%60}分経過 (残り${Math.floor(remaining/60)}時間${remaining%60}分)`);
      console.log(`📁 プロジェクト: ${currentSession.project}`);
    } else {
      console.log('\n⭕ 現在アクティブなセッションはありません');
    }

    console.log('');
  }

  // 過去のセッション履歴を表示
  showHistory(days = 7) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const recentSessions = this.sessions.filter(session => 
      session.startTime >= startDate
    );

    console.log(`📅 過去${days}日間のセッション履歴\n`);

    if (recentSessions.length === 0) {
      console.log('セッションがありません');
      return;
    }

    // 日付ごとにグループ化
    const sessionsByDate = {};
    recentSessions.forEach(session => {
      const dateKey = session.startTime.toDateString();
      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = [];
      }
      sessionsByDate[dateKey].push(session);
    });

    Object.entries(sessionsByDate).forEach(([date, sessions]) => {
      console.log(`${date}: ${sessions.length}セッション`);
      sessions.forEach(session => {
        const time = session.startTime.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const project = session.project.split('/').pop();
        console.log(`  ${time} - ${project}`);
      });
      console.log('');
    });
  }

  // セッション使用量の予測
  showPrediction() {
    const currentMonthSessions = this.getCurrentMonthSessions();
    const now = new Date();
    const daysPassed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    console.log('📊 使用量予測\n');

    if (currentMonthSessions.length === 0) {
      console.log('今月のデータがありません');
      return;
    }

    const dailyAverage = currentMonthSessions.length / daysPassed;
    console.log(`1日平均: ${dailyAverage.toFixed(1)}セッション`);

    const monthlyPrediction = dailyAverage * daysInMonth;
    console.log(`月末予測: ${Math.round(monthlyPrediction)}セッション`);

    const remainingBudget = MAX_SESSIONS_PER_MONTH - currentMonthSessions.length;
    const remainingDays = daysInMonth - daysPassed;
    const recommendedDaily = remainingBudget / remainingDays;

    console.log(`\n残り${remainingDays}日で${remainingBudget}セッション`);
    console.log(`推奨ペース: 1日${recommendedDaily.toFixed(1)}セッション以下`);

    if (monthlyPrediction > MAX_SESSIONS_PER_MONTH) {
      console.log('\n⚠️  現在のペースでは制限に達する可能性があります');
    } else {
      console.log('\n✅ 現在のペースは安全です');
    }
  }
}

// CLI実行部分
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  try {
    const tracker = new SessionTracker();
    tracker.loadAllSessions();

    switch (command) {
      case 'status':
        tracker.showStatus();
        break;
      case 'history':
        const days = parseInt(args[1]) || 7;
        tracker.showHistory(days);
        break;
      case 'predict':
        tracker.showPrediction();
        break;
      default:
        console.log('使用方法:');
        console.log('  claude-code-session-checker status   # 現在の使用状況');
        console.log('  claude-code-session-checker history [日数]  # 履歴表示');
        console.log('  claude-code-session-checker predict  # 使用量予測');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SessionTracker };