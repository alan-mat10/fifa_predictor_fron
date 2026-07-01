export default function TablePrediction() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      {/* Animated Icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-tertiary/20 border-2 border-tertiary/40 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-tertiary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>table_chart</span>
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary/30 border border-secondary/50 flex items-center justify-center animate-bounce">
          <span className="material-symbols-outlined text-secondary text-sm">bolt</span>
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="font-headline font-bold text-2xl neon-glow-tertiary">Knockout Table Prediction</h1>
        <p className="font-label text-sm text-on-surface-variant mt-2">Round of 16 → Quarter Finals → Semi Finals → Final</p>
      </div>

      {/* Coming Soon Badge */}
      <div className="relative">
        <div className="px-8 py-4 bg-gradient-to-r from-tertiary/20 via-primary/10 to-secondary/20 border-2 border-tertiary/40 rounded-2xl animate-pulse shadow-[0_0_30px_rgba(0,255,204,0.2)]">
          <span className="font-headline font-extrabold text-xl text-tertiary tracking-widest animate-pulse">
            ⚡ COMING SOON ⚡
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4 max-w-md">
        <p className="font-label text-sm text-on-surface-variant leading-relaxed">
          Predict the complete knockout bracket — from Round of 16 all the way to the World Cup Final.
        </p>
        <div className="bg-surface-container rounded-xl p-5 border border-secondary/20 text-left space-y-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
            <span className="font-label text-xs text-on-surface-variant">Pick winners for every knockout match</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
            <span className="font-label text-xs text-on-surface-variant">Score bonus points for correct bracket predictions</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
            <span className="font-label text-xs text-on-surface-variant">Compete for the best bracket accuracy</span>
          </div>
        </div>
        <p className="font-label text-xs text-tertiary font-bold animate-pulse">
          🔥 Stay tuned — this feature drops soon!
        </p>
      </div>
    </div>
  )
}
