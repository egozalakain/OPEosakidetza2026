export interface Topic {
  id: number;
  name: string;
  shortName: string;
  startQuestion: number;
  endQuestion: number;
}

export const TOPICS: Topic[] = [
  { id: 1, name: "Ley 44/2003 - Ordenacion Profesiones Sanitarias", shortName: "Ley 44/2003", startQuestion: 1, endQuestion: 10 },
  { id: 2, name: "Ley 16/2003 - Cohesion y Calidad del SNS", shortName: "Ley 16/2003", startQuestion: 11, endQuestion: 20 },
  { id: 3, name: "Ley 55/2003 - Estatuto Marco", shortName: "Ley 55/2003", startQuestion: 21, endQuestion: 35 },
  { id: 4, name: "Ley 8/1997 - Ordenacion Sanitaria Euskadi", shortName: "Ley 8/1997", startQuestion: 36, endQuestion: 50 },
  { id: 5, name: "Decreto 255/1997 - Estatutos de Osakidetza", shortName: "D. 255/1997", startQuestion: 51, endQuestion: 65 },
  { id: 6, name: "Decreto 100/2018 - OSI", shortName: "D. 100/2018", startQuestion: 66, endQuestion: 80 },
  { id: 7, name: "Decreto 147/2015 - Derechos y Deberes", shortName: "D. 147/2015", startQuestion: 81, endQuestion: 88 },
  { id: 8, name: "Ley 41/2002 - Autonomia del Paciente", shortName: "Ley 41/2002", startQuestion: 89, endQuestion: 96 },
  { id: 9, name: "Ley 7/2002 - Voluntades Anticipadas", shortName: "Ley 7/2002", startQuestion: 97, endQuestion: 104 },
  { id: 10, name: "LO 3/2018 - Proteccion de Datos", shortName: "LOPDGDD", startQuestion: 105, endQuestion: 112 },
  { id: 11, name: "DL 1/2023 - Igualdad y Violencia Machista", shortName: "DL 1/2023", startQuestion: 113, endQuestion: 120 },
  { id: 12, name: "Plan de Salud Euskadi 2030", shortName: "Plan Salud 2030", startQuestion: 121, endQuestion: 135 },
  { id: 13, name: "Pacto Vasco de Salud", shortName: "Pacto Salud", startQuestion: 136, endQuestion: 150 },
  { id: 14, name: "Estrategia Seguridad Paciente 2030", shortName: "Seg. Paciente", startQuestion: 151, endQuestion: 160 },
  { id: 15, name: "II Plan Igualdad Osakidetza", shortName: "II Plan Igualdad", startQuestion: 161, endQuestion: 168 },
  { id: 16, name: "III Plan Euskera Osakidetza", shortName: "III Plan Euskera", startQuestion: 169, endQuestion: 176 },
  { id: 17, name: "Plan Oncologico Euskadi", shortName: "Plan Oncologico", startQuestion: 177, endQuestion: 184 },
  { id: 18, name: "LO 3/2021 - Eutanasia", shortName: "LO Eutanasia", startQuestion: 185, endQuestion: 192 },
  { id: 19, name: "Ley 53/1984 - Incompatibilidades", shortName: "Ley 53/1984", startQuestion: 193, endQuestion: 200 },
];

export function getTopicForQuestion(questionNumber: number): string | undefined {
  const topic = TOPICS.find(t => questionNumber >= t.startQuestion && questionNumber <= t.endQuestion);
  return topic?.name;
}

export function getTopicById(id: number): Topic | undefined {
  return TOPICS.find(t => t.id === id);
}
