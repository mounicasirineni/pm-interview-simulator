import { getSessionsWithScores } from './supabase.js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

const QUESTION_TYPES = [
  'product_sense',
  'strategy',
  'analytical',
  'execution',
  'technical_depth',
  'behavioral',
  'estimation'
];

const QUESTION_TYPE_LABELS = {
  product_sense: 'Product Sense',
  strategy: 'Strategy',
  analytical: 'Analytical',
  execution: 'Execution',
  technical_depth: 'Technical Depth',
  behavioral: 'Behavioral',
  estimation: 'Estimation'
};

const COLORS = {
  accent: '#3b82f6',
  success: '#10b981',
  navy700: '#162d50',
  navy600: '#1e3a5f',
  gray400: '#a0aec0',
  white: '#ffffff'
};

let sessionsData = [];
let scoreTrendRoot = null;
let radarChartRoot = null;

export async function loadDashboard() {
  const loadingEl = document.getElementById('dashboard-loading');
  const emptyEl = document.getElementById('dashboard-empty');
  const chartsEl = document.getElementById('dashboard-charts');

  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  chartsEl.classList.add('hidden');

  try {
    sessionsData = await getSessionsWithScores();

    loadingEl.classList.add('hidden');

    if (sessionsData.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    chartsEl.classList.remove('hidden');
    renderScoreTrendChart();
    renderRadarChart();
    renderHeatmap();
    renderSessionLog();
  } catch (error) {
    console.error('Error loading dashboard:', error);
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderScoreTrendChart() {
  const container = document.getElementById('score-trend-chart');

  const chartData = sessionsData.map(session => ({
    date: formatDate(session.created_at),
    fullDate: formatFullDate(session.created_at),
    score: session.overall_score,
    type: QUESTION_TYPE_LABELS[session.question_type] || session.question_type
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return createElement('div', { className: 'chart-tooltip' },
        createElement('div', { className: 'chart-tooltip-label' }, data.fullDate),
        createElement('div', { className: 'chart-tooltip-type' }, data.type),
        createElement('div', { className: 'chart-tooltip-value' }, `Score: ${data.score}/10`)
      );
    }
    return null;
  };

  const chart = createElement(ResponsiveContainer, { width: '100%', height: '100%' },
    createElement(LineChart, { data: chartData, margin: { top: 5, right: 20, left: 0, bottom: 5 } },
      createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: COLORS.navy600 }),
      createElement(XAxis, {
        dataKey: 'date',
        stroke: COLORS.gray400,
        tick: { fill: COLORS.gray400, fontSize: 12 }
      }),
      createElement(YAxis, {
        domain: [0, 10],
        stroke: COLORS.gray400,
        tick: { fill: COLORS.gray400, fontSize: 12 },
        ticks: [0, 2, 4, 6, 8, 10]
      }),
      createElement(Tooltip, { content: createElement(CustomTooltip) }),
      createElement(Line, {
        type: 'monotone',
        dataKey: 'score',
        stroke: COLORS.accent,
        strokeWidth: 2,
        dot: { fill: COLORS.accent, strokeWidth: 2, r: 4 },
        activeDot: { r: 6, fill: COLORS.accent }
      })
    )
  );

  if (!scoreTrendRoot) {
    scoreTrendRoot = createRoot(container);
  }
  scoreTrendRoot.render(chart);
}

function renderRadarChart() {
  const container = document.getElementById('radar-chart');

  const totals = { structure: 0, specificity: 0, opinion_clarity: 0, depth_under_pressure: 0, overall: 0 };
  let count = 0;

  sessionsData.forEach(session => {
    if (session.scores && session.scores.length > 0) {
      const score = session.scores[0];
      totals.structure += score.structure || 0;
      totals.specificity += score.specificity || 0;
      totals.opinion_clarity += score.opinion_clarity || 0;
      totals.depth_under_pressure += score.depth_under_pressure || 0;
      totals.overall += session.overall_score || 0;
      count++;
    }
  });

  if (count === 0) {
    container.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding-top: 100px;">No dimension data available</p>';
    return;
  }

  const radarData = [
    { dimension: 'Structure', value: Math.round((totals.structure / count) * 10) / 10, fullMark: 10 },
    { dimension: 'Specificity', value: Math.round((totals.specificity / count) * 10) / 10, fullMark: 10 },
    { dimension: 'Opinion Clarity', value: Math.round((totals.opinion_clarity / count) * 10) / 10, fullMark: 10 },
    { dimension: 'Depth', value: Math.round((totals.depth_under_pressure / count) * 10) / 10, fullMark: 10 },
    { dimension: 'Overall', value: Math.round((totals.overall / count) * 10) / 10, fullMark: 10 }
  ];

  const chart = createElement(ResponsiveContainer, { width: '100%', height: '100%' },
    createElement(RadarChart, { data: radarData, margin: { top: 20, right: 30, bottom: 20, left: 30 } },
      createElement(PolarGrid, { stroke: COLORS.navy600 }),
      createElement(PolarAngleAxis, {
        dataKey: 'dimension',
        tick: { fill: COLORS.gray400, fontSize: 11 }
      }),
      createElement(PolarRadiusAxis, {
        angle: 90,
        domain: [0, 10],
        tick: { fill: COLORS.gray400, fontSize: 10 },
        axisLine: false
      }),
      createElement(Radar, {
        name: 'Score',
        dataKey: 'value',
        stroke: COLORS.accent,
        fill: COLORS.accent,
        fillOpacity: 0.3,
        strokeWidth: 2
      })
    )
  );

  if (!radarChartRoot) {
    radarChartRoot = createRoot(container);
  }
  radarChartRoot.render(chart);
}

function renderHeatmap() {
  const container = document.getElementById('heatmap');

  const typeStats = {};
  QUESTION_TYPES.forEach(type => {
    typeStats[type] = { sessions: 0, totalScore: 0 };
  });

  sessionsData.forEach(session => {
    const type = session.question_type;
    if (typeStats[type]) {
      typeStats[type].sessions++;
      typeStats[type].totalScore += session.overall_score || 0;
    }
  });

  let maxAvg = 0;
  Object.values(typeStats).forEach(stat => {
    if (stat.sessions > 0) {
      const avg = stat.totalScore / stat.sessions;
      if (avg > maxAvg) maxAvg = avg;
    }
  });

  container.innerHTML = QUESTION_TYPES.map(type => {
    const stat = typeStats[type];
    const avgScore = stat.sessions > 0 ? (stat.totalScore / stat.sessions).toFixed(1) : null;
    const intensity = avgScore ? (parseFloat(avgScore) / 10) : 0;

    const bgColor = avgScore
      ? `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`
      : 'var(--navy-700)';

    return `
      <div class="heatmap-cell" style="background-color: ${bgColor}">
        <div class="heatmap-cell-type">${QUESTION_TYPE_LABELS[type]}</div>
        <div class="heatmap-cell-sessions">${stat.sessions} session${stat.sessions !== 1 ? 's' : ''}</div>
        ${avgScore
          ? `<div class="heatmap-cell-score">${avgScore}</div>`
          : `<div class="heatmap-cell-none">-</div>`
        }
      </div>
    `;
  }).join('');
}

function renderSessionLog() {
  const container = document.getElementById('session-log');

  const sortedSessions = [...sessionsData].reverse();

  container.innerHTML = sortedSessions.map(session => {
    const score = session.scores && session.scores.length > 0 ? session.scores[0] : null;
    const debrief = score?.debrief || session.debrief_text || 'No debrief available';

    return `
      <div class="session-log-item" data-session-id="${session.id}">
        <div class="session-log-header">
          <div class="session-log-info">
            <span class="session-log-date">${formatFullDate(session.created_at)}</span>
            <span class="session-log-type">${QUESTION_TYPE_LABELS[session.question_type] || session.question_type}</span>
          </div>
          ${session.initial_question ? `<div class="session-log-question">${session.initial_question}</div>` : ''}
          <div style="display: flex; align-items: center; gap: 16px;">
            <span class="session-log-score">${session.overall_score}/10</span>
            <span class="session-log-expand">▼</span>
          </div>
        </div>
        <div class="session-log-details">
          ${score ? `
            <div class="session-log-scores">
              <div class="session-log-score-item">
                <div class="session-log-score-label">Structure</div>
                <div class="session-log-score-value">${score.structure}/10</div>
              </div>
              <div class="session-log-score-item">
                <div class="session-log-score-label">Specificity</div>
                <div class="session-log-score-value">${score.specificity}/10</div>
              </div>
              <div class="session-log-score-item">
                <div class="session-log-score-label">Opinion Clarity</div>
                <div class="session-log-score-value">${score.opinion_clarity}/10</div>
              </div>
              <div class="session-log-score-item">
                <div class="session-log-score-label">Depth</div>
                <div class="session-log-score-value">${score.depth_under_pressure}/10</div>
              </div>
            </div>
          ` : ''}
          <div class="session-log-debrief">${debrief}</div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.session-log-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.session-log-item');
      item.classList.toggle('expanded');
    });
  });
}

export function setupNavigation(onTabChange) {
  const navTabs = document.querySelectorAll('.nav-tab');
  const practiceView = document.getElementById('practice-view');
  const progressView = document.getElementById('progress-view');
  const startPracticingBtn = document.getElementById('start-practicing');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (targetTab === 'practice') {
        practiceView.classList.remove('hidden');
        progressView.classList.add('hidden');
      } else {
        practiceView.classList.add('hidden');
        progressView.classList.remove('hidden');
        loadDashboard();
      }

      if (onTabChange) {
        onTabChange(targetTab);
      }
    });
  });

  if (startPracticingBtn) {
    startPracticingBtn.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      document.querySelector('.nav-tab[data-tab="practice"]').classList.add('active');
      practiceView.classList.remove('hidden');
      progressView.classList.add('hidden');
    });
  }
}
