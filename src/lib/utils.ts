export function normalizeSession(s: any) {
  return {
    id: s.id,
    student: s.patient?.name ?? '',
    program: s.program?.name ?? '',
    date: new Date(s.session_date + 'T12:00:00').toLocaleDateString('pt-BR'),
    time: (s.session_time ?? '').slice(0, 5),
    timestamp: new Date(s.recorded_at).getTime(),
    plannedTrials: s.planned_trials,
    trials: s.trials,
    score: s.score,
    rate: parseFloat(s.rate),
    pdi: s.pdi !== null ? parseFloat(s.pdi) : null,
    ind: s.ind_count,
    pr: s.pr_count,
    err: s.err_count,
    criterion: s.criterion,
    duration: s.duration,
    streak: s.streak,
    notes: s.notes ?? '',
    log: s.trial_log ?? [],
    phase: s.phase ?? 'acquisition',
    promptMode: s.prompt_mode ?? 'simple',
    collectionType: s.collection_type ?? 'dtt',
    _patientId: s.patient?.id,
    _programId: s.program?.id,
  }
}

export function cls(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
