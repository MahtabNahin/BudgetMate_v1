import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import './Simulator.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const money = (value) => `৳${Math.round(Number(value) || 0).toLocaleString()}`;

const PRESETS = {
  save_more: { label: '💰 Save More', reduction: 10 },
  balanced: { label: '⚖️ Balanced', reduction: 20 },
  aggressive: { label: '🔥 Aggressive Saving', reduction: 35 },
};

const buildPreset = (baseline, reduction) => Object.fromEntries(
  baseline.map((item) => [item.category_id, reduction])
);

export default function Simulator() {
  const [baseline, setBaseline] = useState([]);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [reductions, setReductions] = useState({});
  const [preset, setPreset] = useState('custom');
  const [selectedGoalId, setSelectedGoalId] = useState('');

  const loadGoals = async () => {
    try {
      const res = await api.get('/goals');
      const nextGoals = Array.isArray(res.data) ? res.data : [];
      setGoals(nextGoals);
      setSelectedGoalId((current) => {
        if (current && nextGoals.some((goal) => String(goal.id) === String(current))) return current;
        return nextGoals[0]?.id ? String(nextGoals[0].id) : '';
      });
    } catch (err) {
      console.error('Simulator goals error:', err);
    }
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get('/insights/simulator-baseline'),
      api.get('/goals'),
    ])
      .then(([baselineRes, goalsRes]) => {
        if (!mounted) return;
        const data = baselineRes.data || {};
        setBaseline(Array.isArray(data) ? data : data.baseline || []);
        setCurrentSavings(Number(data.current_month_savings || 0));
        const nextGoals = Array.isArray(goalsRes.data) ? goalsRes.data : [];
        setGoals(nextGoals);
        setSelectedGoalId(nextGoals[0]?.id ? String(nextGoals[0].id) : '');
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Could not load simulator data.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const handleGoalUpdate = () => loadGoals();
    window.addEventListener('budgetmate:goals-updated', handleGoalUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('budgetmate:goals-updated', handleGoalUpdate);
    };
  }, []);

  useEffect(() => {
    const category = searchParams.get('category');
    if (!category || baseline.length === 0) return;

    const categoryExists = baseline.some((item) => String(item.category_id) === String(category));
    if (!categoryExists) return;

    setReductions((prev) => ({ ...prev, [category]: Math.max(Number(prev[category] || 0), 10) }));
    setPreset('custom');
  }, [searchParams, baseline]);

  const handleSlider = (categoryId, value) => {
    setPreset('custom');
    setReductions((prev) => ({ ...prev, [categoryId]: Number(value) }));
  };

  const selectPreset = (presetKey) => {
    setPreset(presetKey);
    if (presetKey === 'custom') {
      setReductions({});
      return;
    }
    setReductions(buildPreset(baseline, PRESETS[presetKey].reduction));
  };

  const simulation = useMemo(() => {
    const currentExpense = baseline.reduce(
      (sum, category) => sum + Number(category.simulation_spend ?? category.current_month_spend ?? category.avg_monthly_spend ?? 0),
      0
    );

    const extraSavings = baseline.reduce((sum, category) => {
      const reduction = Number(reductions[category.category_id] || 0);
      const spend = Number(category.simulation_spend ?? category.current_month_spend ?? category.avg_monthly_spend ?? 0);
      return sum + spend * (reduction / 100);
    }, 0);

    const simulatedSavings = currentSavings + extraSavings;
    const simulatedExpense = Math.max(currentExpense - extraSavings, 0);

    return {
      extraSavings,
      simulatedSavings,
      currentExpense,
      simulatedExpense,
      yearlyImpact: extraSavings * 12,
    };
  }, [baseline, currentSavings, reductions]);

  const bestOpportunity = useMemo(() => {
    if (!baseline.length) return null;
    return [...baseline].sort((a, b) => {
      const aSpend = Number(a.simulation_spend ?? a.current_month_spend ?? a.avg_monthly_spend ?? 0);
      const bSpend = Number(b.simulation_spend ?? b.current_month_spend ?? b.avg_monthly_spend ?? 0);
      return bSpend - aSpend;
    })[0];
  }, [baseline]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => String(goal.id) === String(selectedGoalId)) || goals[0] || null,
    [goals, selectedGoalId]
  );

  const goalImpact = useMemo(() => {
    if (!selectedGoal) return null;

    const target = Number(selectedGoal.target_amount || 0);
    const saved = Number(selectedGoal.current_saved || 0);
    const remaining = Math.max(target - saved, 0);
    const currentRate = Math.max(currentSavings, 0);
    const simulatedRate = Math.max(simulation.simulatedSavings, 0);

    const currentMonths = remaining <= 0 ? 0 : currentRate > 0 ? Math.ceil(remaining / currentRate) : null;
    const simulatedMonths = remaining <= 0 ? 0 : simulatedRate > 0 ? Math.ceil(remaining / simulatedRate) : null;
    const faster = currentMonths !== null && simulatedMonths !== null
      ? Math.max(currentMonths - simulatedMonths, 0)
      : null;

    return {
      target,
      saved,
      remaining,
      currentRate,
      simulatedRate,
      currentMonths,
      simulatedMonths,
      faster,
    };
  }, [selectedGoal, currentSavings, simulation.simulatedSavings]);

  const tryBestCut = () => {
    if (!bestOpportunity) return;
    const currentReduction = Number(reductions[bestOpportunity.category_id] || 0);
    const nextReduction = Math.min(currentReduction + 10, 100);
    setPreset('custom');
    setReductions((prev) => ({ ...prev, [bestOpportunity.category_id]: nextReduction }));
    showToast(`${bestOpportunity.category_name} set to a ${nextReduction}% reduction.`);
  };

  const chartData = {
    labels: baseline.map((b) => b.category_name),
    datasets: [
      {
        label: 'Current monthly spend',
        data: baseline.map((b) => Number(b.simulation_spend ?? b.current_month_spend ?? b.avg_monthly_spend ?? 0)),
        backgroundColor: '#e53935',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Simulated spend',
        data: baseline.map((b) => {
          const spend = Number(b.simulation_spend ?? b.current_month_spend ?? b.avg_monthly_spend ?? 0);
          const reduction = Number(reductions[b.category_id] || 0);
          return Math.round(spend * (1 - reduction / 100));
        }),
        backgroundColor: '#4caf50',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${money(context.raw)}` } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#eef0f3' }, ticks: { callback: (value) => money(value) } },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="page simulator-page">
      <div className="simulator-header">
        <div>
          <h1>What-If Simulator</h1>
          <p>Adjust the sliders to see how small spending changes could affect your savings.</p>
        </div>
        {simulation.extraSavings > 0 && <div className="simulator-live-pill">Live simulation</div>}
      </div>

      {loading && <div className="card simulator-empty">Loading your spending data…</div>}
      {error && <div className="card simulator-error">{error}</div>}

      {!loading && !error && baseline.length === 0 && (
        <div className="card simulator-empty">
          <div className="simulator-empty-icon">🌱</div>
          <h3>Not enough transaction history yet</h3>
          <p>Add a few expenses and come back to see what your savings could look like.</p>
        </div>
      )}

      {!loading && !error && baseline.length > 0 && (
        <>
          <div className="card scenario-card">
            <div className="card-heading">
              <div>
                <h3>Quick Scenarios</h3>
                <p>Start with a plan, then fine-tune any category below.</p>
              </div>
              {preset !== 'custom' && <span className="scenario-active">{PRESETS[preset].label}</span>}
            </div>
            <div className="scenario-buttons">
              {Object.entries(PRESETS).map(([key, item]) => (
                <button key={key} className={`scenario-btn ${preset === key ? 'active' : ''}`} onClick={() => selectPreset(key)}>
                  {item.label}
                  {key !== 'custom' && <small>-{item.reduction}%</small>}
                </button>
              ))}
            </div>
          </div>

          <div className="simulator-comparison-grid">
            <div className="simulator-metric"><span>Current monthly savings</span><strong>{money(currentSavings)}</strong></div>
            <div className="simulator-metric simulated"><span>Simulated monthly savings</span><strong>{money(simulation.simulatedSavings)}</strong></div>
            <div className="simulator-metric extra"><span>Extra monthly savings</span><strong>+{money(simulation.extraSavings)}</strong><small>per month</small></div>
            <div className="simulator-metric yearly"><span>Potential yearly savings</span><strong>+{money(simulation.yearlyImpact)}</strong><small>12-month impact</small></div>
          </div>

          <div className={`simulator-result ${simulation.extraSavings > 0 ? 'improved' : ''}`}>
            <div>
              <span>Monthly spending</span>
              <strong>{money(simulation.currentExpense)}</strong>
              <span className="simulator-arrow">→</span>
              <strong className="simulated-number">{money(simulation.simulatedExpense)}</strong>
            </div>
            {simulation.extraSavings > 0 ? (
              <p>🎉 You could save {money(simulation.extraSavings)} more every month!</p>
            ) : (
              <p>Move a slider or choose a scenario to see how your savings could improve.</p>
            )}
          </div>

          <div className="card simulator-controls">
            <div className="card-heading">
              <div><h3>Adjust your spending</h3><p>Changes update the comparison and chart instantly.</p></div>
            </div>
            <div className="simulator-slider-list">
              {baseline.map((b) => {
                const reduction = Number(reductions[b.category_id] || 0);
                const spend = Number(b.simulation_spend ?? b.current_month_spend ?? b.avg_monthly_spend ?? 0);
                const simulated = spend * (1 - reduction / 100);
                return (
                  <div key={b.category_id} className={`simulator-slider-row ${reduction > 0 ? 'changed' : ''}`}>
                    <div className="simulator-slider-label">
                      <div><strong>{b.category_name}</strong><span>{money(spend)} current</span></div>
                      <div className="simulator-slider-values"><strong>{reduction}%</strong>{reduction > 0 && <span>→ {money(simulated)}</span>}</div>
                    </div>
                    <input type="range" min="0" max="100" step="5" value={reduction} onChange={(e) => handleSlider(b.category_id, e.target.value)} aria-label={`Reduce ${b.category_name} spending`} />
                  </div>
                );
              })}
            </div>
          </div>

          {bestOpportunity && (
            <div className="card best-cut-card">
              <div className="best-cut-icon">💡</div>
              <div className="best-cut-content">
                <span className="section-kicker">Biggest opportunity</span>
                <h3>{bestOpportunity.category_name}</h3>
                <p>You currently spend <strong>{money(bestOpportunity.simulation_spend ?? bestOpportunity.current_month_spend ?? bestOpportunity.avg_monthly_spend)}</strong> per month on {bestOpportunity.category_name}. Reducing it by another 10% could save approximately <strong>{money(Number(bestOpportunity.simulation_spend ?? bestOpportunity.current_month_spend ?? bestOpportunity.avg_monthly_spend) * 0.10)}</strong> per month.</p>
              </div>
              <button className="best-cut-btn" onClick={tryBestCut}>Try this</button>
            </div>
          )}

          <div className="card goal-impact-card">
            <div className="card-heading">
              <div><h3>What could you achieve?</h3><p>See how this scenario could change your savings goal timeline.</p></div>
              {goals.length > 1 && (
                <select className="goal-select" value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)}>
                  {goals.map((goal) => <option key={goal.id} value={goal.id}>🎯 {goal.name}</option>)}
                </select>
              )}
            </div>

            {!selectedGoal || !goalImpact ? (
              <div className="goal-impact-empty">
                <div>🎯</div>
                <p>Create a savings goal to see how your spending changes could help you reach it.</p>
                <button className="empty-action" onClick={() => navigate('/goals')}>Create a Savings Goal</button>
              </div>
            ) : (
              <div className="goal-impact-grid">
                <div className="goal-impact-extra"><span>Extra savings</span><strong>{money(simulation.extraSavings)} <small>/ month</small></strong><em>+{money(simulation.yearlyImpact)} / year</em></div>
                <div className="goal-impact-goal"><span>🎯 {selectedGoal.name}</span><strong>{money(goalImpact.saved)} <small>/ {money(goalImpact.target)}</small></strong><div className="progress-track"><div className="progress-fill good" style={{ width: `${Math.min((goalImpact.saved / Math.max(goalImpact.target, 1)) * 100, 100)}%` }} /></div><small>{money(goalImpact.remaining)} remaining</small></div>
                <div className="goal-impact-time"><span>Estimated time</span><strong>{goalImpact.simulatedMonths === 0 ? 'Completed' : goalImpact.simulatedMonths === null ? 'Not enough savings' : `${goalImpact.simulatedMonths} month${goalImpact.simulatedMonths === 1 ? '' : 's'}`}</strong>{goalImpact.faster !== null && goalImpact.faster > 0 ? <p>✨ With this scenario, you could reach your goal <strong>{goalImpact.faster} month{goalImpact.faster === 1 ? '' : 's'}</strong> faster.</p> : goalImpact.simulatedMonths !== null && simulation.extraSavings > 0 ? <p>Keep it up — this scenario improves your monthly savings rate.</p> : <p>Try a scenario to see a faster path.</p>}</div>
              </div>
            )}
          </div>

          <div className="card simulator-chart-card">
            <div className="card-heading"><div><h3>Current vs Simulated Spending</h3><p>The gap grows as you reduce a category.</p></div></div>
            <div className="simulator-chart-container"><Bar data={chartData} options={chartOptions} /></div>
          </div>
        </>
      )}
    </div>
  );
}
