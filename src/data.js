export const groups = {
  A: ["Deportivo del Valle", "AC Detox", "Inter de Mami", "Jorgito Lopez"],
  B: ["Kallad FC", "Escombro FC", "Los X Men FC", "Zapos FC"],
  C: ["Amigos de Monda", "Senecinos FC", "Mortex", "Vikingos FC"]
};

const schedule = {
  A: [
    ["11:00","11:12","Deportivo del Valle","AC Detox"],
    ["11:45","11:57","Inter de Mami","Jorgito Lopez"],
    ["12:30","12:42","Deportivo del Valle","Inter de Mami"],
    ["13:15","13:27","AC Detox","Jorgito Lopez"],
    ["14:00","14:12","Deportivo del Valle","Jorgito Lopez"],
    ["14:45","14:57","AC Detox","Inter de Mami"]
  ],
  B: [
    ["11:15","11:27","Kallad FC","Escombro FC"],
    ["12:00","12:12","Los X Men FC","Zapos FC"],
    ["12:45","12:57","Kallad FC","Los X Men FC"],
    ["13:30","13:42","Escombro FC","Zapos FC"],
    ["14:15","14:27","Kallad FC","Zapos FC"],
    ["15:00","15:12","Escombro FC","Los X Men FC"]
  ],
  C: [
    ["11:30","11:42","Amigos de Monda","Senecinos FC"],
    ["12:15","12:27","Mortex","Vikingos FC"],
    ["13:00","13:12","Amigos de Monda","Mortex"],
    ["13:45","13:57","Senecinos FC","Vikingos FC"],
    ["14:30","14:42","Amigos de Monda","Vikingos FC"],
    ["15:15","15:27","Senecinos FC","Mortex"]
  ]
};

export function demoMatches() {
  return Object.entries(schedule).flatMap(([group, rows]) => rows.map((r, i) => ({
    id: `${group}-${i+1}`, group, kickoff: r[0], end_time: r[1],
    home_team: r[2], away_team: r[3], home_score: null, away_score: null,
    status: "scheduled", round: "group", sort_order: i+1
  })));
}
