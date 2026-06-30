export default function Rules() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-headline font-bold text-2xl neon-glow-primary">Points System</h1>
        <p className="font-label text-sm text-on-surface-variant mt-1">How scoring works in WC26 Predictor</p>
      </div>

      {/* Per Match Predictions */}
      <div className="bg-surface-container rounded-xl p-6 primary-glow-border">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">sports_soccer</span>
          Per Match Predictions
        </h3>
        <div className="space-y-3">
          <PointRow icon="check_circle" color="secondary" points="+1" label="Correct Match Result" desc="Predict win/draw/loss correctly" />
          <PointRow icon="scoreboard" color="primary" points="+2" label="Exact Score" desc="Predict the exact scoreline (bonus on top of match result = +3 total)" />
          <PointRow icon="gavel" color="tertiary" points="+1" label="Penalty Winner (Knockout)" desc="Predict which team wins on penalties when you predict a draw" />
          <PointRow icon="person" color="secondary" points="+2" label="Correct Goal Scorer" desc="Per correct player × predicted goals (e.g., predict 2 goals, scores 2 = +4)" />
          <PointRow icon="person_off" color="error" points="-2" label="Wrong Goal Scorer" desc="Per incorrect predicted goal (e.g., predict 1 goal, scores 0 = -2)" />
          <PointRow icon="star" color="tertiary" points="+3" label="Man of the Match" desc="Predict the official MOTM correctly" />
        </div>
      </div>

      {/* Tournament Predictions */}
      <div className="bg-surface-container rounded-xl p-6 card-glow">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          Tournament Predictions
        </h3>
        <div className="space-y-3">
          <PointRow icon="trophy" color="tertiary" points="+5" label="World Cup Winner" desc="Predict the winning team" />
          <PointRow icon="sports_soccer" color="primary" points="+4" label="Golden Boot" desc="Predict the tournament's top goal scorer" />
          <PointRow icon="emoji_events" color="secondary" points="+4" label="Golden Ball" desc="Predict the best player of the tournament" />
          <PointRow icon="sports_handball" color="secondary" points="+4" label="Golden Glove" desc="Predict the best goalkeeper of the tournament" />
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-surface-container rounded-xl p-6 border border-outline-variant">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">help</span>
          How It Works
        </h3>
        <div className="space-y-4 font-body text-sm text-on-surface-variant">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-lg mt-0.5">lock_clock</span>
            <p><strong className="text-on-surface">Predictions lock at kickoff.</strong> You cannot change your prediction once the match starts.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-lg mt-0.5">visibility_off</span>
            <p><strong className="text-on-surface">Hidden until match ends.</strong> Other users' predictions are only visible after the match is completed.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-lg mt-0.5">update</span>
            <p><strong className="text-on-surface">Points update automatically.</strong> After match results are entered, points are calculated and added to your total.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">block</span>
            <p><strong className="text-on-surface">Tournament predictions lock.</strong> Admin sets a lock date — after that you cannot change winner/golden boot/ball/glove picks.</p>
          </div>
        </div>
      </div>

      {/* Example */}
      <div className="bg-surface-container rounded-xl p-6 border border-secondary/20">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">calculate</span>
          Example Scoring
        </h3>
        <div className="bg-surface-dim rounded-lg p-4 font-label text-xs space-y-2">
          <p className="text-on-surface-variant">Match: Mexico 2 - 0 South Africa</p>
          <p className="text-on-surface-variant">Your prediction: 2 - 0 ✅</p>
          <p className="text-on-surface-variant">Your goal scorers: Julián Quiñones ×2 ✅ (scored 2), Santiago Giménez ×1 ❌ (scored 0)</p>
          <p className="text-on-surface-variant">Your MOTM: Julián Quiñones ✅</p>
          <div className="border-t border-outline-variant pt-2 mt-2 space-y-1">
            <p className="text-secondary">+ 1 (correct result)</p>
            <p className="text-primary">+ 2 (exact score)</p>
            <p className="text-secondary">+ 4 (Quiñones predicted 2, scored 2 → 2×+2)</p>
            <p className="text-error">- 2 (Giménez predicted 1, scored 0 → 1×-2)</p>
            <p className="text-tertiary">+ 3 (correct MOTM)</p>
            <p className="text-on-surface font-bold border-t border-outline-variant pt-1 mt-1">= 8 points total for this match</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PointRow({ icon, color, points, label, desc }) {
  const isNegative = points.startsWith('-')
  return (
    <div className="flex items-center justify-between p-3 bg-surface-dim rounded-lg">
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-${color} text-lg`}>{icon}</span>
        <div>
          <p className="font-label text-sm text-on-surface font-bold">{label}</p>
          <p className="font-label text-[10px] text-on-surface-variant">{desc}</p>
        </div>
      </div>
      <span className={`font-headline font-extrabold text-lg ${isNegative ? 'text-error' : `text-${color}`}`}>
        {points}
      </span>
    </div>
  )
}
