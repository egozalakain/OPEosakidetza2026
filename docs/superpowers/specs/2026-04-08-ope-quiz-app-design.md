# OPE Osakidetza Quiz App — Especificacion de Diseno

## Contexto

Preparacion para el examen OPE de Osakidetza (Servicio Vasco de Salud), categorias A, B y C1. Existe una bateria de 200 preguntas tipo test (4 opciones a/b/c/d) sobre temario comun, con respuestas justificadas. Se necesita una aplicacion web para practicar estas preguntas con seguimiento de progreso, estadisticas detalladas y modos de estudio/examen que simulen condiciones reales.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Estilos | Tailwind CSS |
| Tema claro/oscuro | next-themes |
| Graficos | Recharts |
| ORM | Drizzle ORM |
| Base de datos | Vercel Postgres (Neon) |
| Autenticacion | NextAuth.js (Credentials provider, usuario hardcodeado) |
| Hosting | Vercel (free tier) |

---

## Modelo de Datos

### Tabla `questions`
| Columna | Tipo | Descripcion |
|---------|------|------------|
| id | serial PK | |
| number | int (1-200) | Numero de pregunta del PDF |
| topic | varchar | Bloque tematico |
| text | text | Enunciado de la pregunta |
| option_a | text | Opcion a |
| option_b | text | Opcion b |
| option_c | text | Opcion c |
| option_d | text | Opcion d |
| correct_answer | char(1) | a/b/c/d |
| explanation | text | Justificacion de la respuesta correcta |

### Tabla `exams`
| Columna | Tipo | Descripcion |
|---------|------|------------|
| id | serial PK | |
| started_at | timestamp | Inicio del examen |
| finished_at | timestamp (nullable) | Fin del examen |
| mode | enum('exam','study') | Modo examen o estudio |
| timer_mode | enum('countdown','stopwatch','none') | Tipo de temporizador |
| timer_seconds | int (nullable) | Limite en segundos si countdown |
| question_selection | enum('random','weak','topic') | Criterio de seleccion |
| topic_filter | varchar (nullable) | Tema si seleccion por tema |
| total_questions | int (nullable) | Null = modo libre |
| correct_count | int default 0 | Respuestas correctas |
| wrong_count | int default 0 | Respuestas incorrectas |
| blank_count | int default 0 | Sin responder |
| raw_score | decimal | Aciertos sin penalizar |
| penalized_score | decimal | Aciertos - Errores/3 |

### Tabla `exam_answers`
| Columna | Tipo | Descripcion |
|---------|------|------------|
| id | serial PK | |
| exam_id | FK -> exams | |
| question_id | FK -> questions | |
| question_order | int | Posicion en el examen |
| selected_answer | char(1) nullable | a/b/c/d o null (en blanco) |
| is_correct | boolean (nullable) | null si en blanco |
| flagged | boolean default false | Marcada como duda |
| time_spent_seconds | int (nullable) | Tiempo en esta pregunta |

### Tabla `question_stats`
| Columna | Tipo | Descripcion |
|---------|------|------------|
| question_id | PK, FK -> questions | |
| times_shown | int default 0 | Veces presentada |
| times_correct | int default 0 | Veces acertada |
| times_wrong | int default 0 | Veces fallada |
| times_blank | int default 0 | Veces en blanco |
| error_rate | decimal | times_wrong / (times_correct + times_wrong) |
| last_answered_at | timestamp (nullable) | |

### Tabla `user_settings`
| Columna | Tipo | Descripcion |
|---------|------|------------|
| key | varchar PK | Nombre del ajuste |
| value | text | Valor |

---

## Bloques Tematicos (19)

Extraidos del fichero de respuestas (RESPUESTAS-BATERIA-COMUN.md), con rangos de preguntas:

1. **Ley 44/2003** — Ordenacion Profesiones Sanitarias (preguntas 1-10)
2. **Ley 16/2003** — Cohesion y Calidad del SNS (11-20)
3. **Ley 55/2003** — Estatuto Marco (21-35)
4. **Ley 8/1997** — Ordenacion Sanitaria de Euskadi (36-50)
5. **Decreto 255/1997** — Estatutos de Osakidetza (51-65)
6. **Decreto 100/2018** — OSI (66-80)
7. **Decreto 147/2015** — Derechos y Deberes (81-88)
8. **Ley 41/2002** — Autonomia del Paciente (89-96)
9. **Ley 7/2002** — Voluntades Anticipadas (97-104)
10. **LO 3/2018** — Proteccion de Datos (105-112)
11. **DL 1/2023** — Igualdad y Violencia Machista (113-120)
12. **Plan de Salud Euskadi 2030** (121-135)
13. **Pacto Vasco de Salud** (136-150)
14. **Estrategia Seguridad Paciente 2030** (151-160)
15. **II Plan Igualdad Osakidetza** (161-168)
16. **III Plan Euskera Osakidetza** (169-176)
17. **Plan Oncologico Euskadi** (177-184)
18. **LO 3/2021** — Eutanasia (185-192)
19. **Ley 53/1984** — Incompatibilidades (193-200)

---

## Autenticacion

- NextAuth.js con Credentials provider
- Usuario y password hardcodeados en variables de entorno (`AUTH_USER`, `AUTH_PASSWORD`)
- Sesion basada en JWT
- Middleware de Next.js para proteger todas las rutas excepto `/login`
- Usuario unico, sin registro

---

## Modos de Uso

### Modo Examen
- Simula condiciones reales de la OPE
- Correccion **siempre al final** del examen
- Penalizacion activa: `nota = aciertos - (errores / 3)`
- Preguntas en blanco: 0 puntos (no penalizan)
- Temporizador configurable: cuenta atras, cronometro, o sin tiempo
- N° de preguntas: 10, 20, 30, 50, o libre (se barajan todas las preguntas disponibles segun criterio de seleccion y se presentan secuencialmente hasta pulsar "Finalizar")
- Navegacion libre: ir adelante/atras, cambiar respuestas
- Al finalizar: pantalla de resultados con nota, desglose, enlace a revision detallada
- Se puede marcar preguntas como "duda" (flag)

### Modo Estudio
- Para aprender a tu ritmo
- Correccion **siempre inmediata** tras cada pregunta
- Tras responder: muestra si es correcta/incorrecta + justificacion legal
- Sin penalizacion
- Sin temporizador
- Siempre modo libre (hasta que pulse "Terminar")
- Solo avanza (no se vuelve atras una vez respondida)
- No hay pantalla de resultados final

### Estadisticas
- **Ambos modos cuentan** para estadisticas y para el algoritmo de "preguntas debiles"

---

## Seleccion de Preguntas

Tres criterios al configurar un examen/sesion:

1. **Aleatorio** — seleccion al azar de todo el banco de 200 preguntas
2. **Puntos debiles** — prioriza preguntas con mayor `error_rate` en `question_stats`. Algoritmo: ordenar por error_rate descendente, tomar las N primeras con algo de aleatoridad para no repetir siempre las mismas
3. **Por tema** — seleccion aleatoria dentro de un bloque tematico especifico

---

## Pantallas

### 1. Login (`/login`)
- Formulario simple: usuario + password
- Error generico si credenciales incorrectas
- Redirige a Dashboard tras login

### 2. Dashboard (`/`)
- 4 KPIs: examenes realizados, tasa de acierto global, preguntas respondidas, preguntas debiles (error_rate > 50%)
- 2 botones principales: "Nuevo Examen" y "Reforzar Puntos Debiles"
- El boton "Reforzar Puntos Debiles" crea un examen con seleccion "weak" directamente

### 3. Configurar Examen (`/examen/nuevo`)
- Modo: Examen | Estudio
- N° preguntas: 10 | 20 | 30 | 50 | Libre (solo en modo Examen; Estudio siempre libre)
- Seleccion: Aleatorio | Puntos debiles | Por tema (dropdown de temas)
- Temporizador: Cuenta atras | Cronometro | Sin tiempo (solo en modo Examen; Estudio sin tiempo)
- Boton "Comenzar"

### 4. Realizar Examen (`/examen/[id]`)
- **Barra superior**: pregunta actual / total, temporizador, boton "Finalizar"
- **Cuadricula de navegacion**: numeros de pregunta coloreados
  - Modo Examen: azul (actual), verde (respondida), amarillo (marcada duda), gris (sin responder)
  - Modo Estudio: verde (correcta), rojo (incorrecta), gris (sin responder), azul (actual)
- **Pregunta**: enunciado + 4 opciones clickables
- **Modo Estudio**: tras responder, muestra resultado + justificacion + boton "Siguiente"
- **Controles**: Anterior (solo Examen) | Marcar duda | Siguiente
- **Dejar en blanco**: simplemente pulsar "Siguiente" sin seleccionar

### 5. Resultados (`/examen/[id]/resultados`)
- Solo modo Examen
- Puntuacion grande centrada (% acierto)
- Desglose: correctas, incorrectas, en blanco, nota penalizada, tiempo total
- Botones: "Revisar respuestas", "Nuevo examen", "Inicio"

### 6. Revision (`/examen/[id]/revision`)
- Lista de todas las preguntas del examen
- Por cada pregunta: enunciado, tu respuesta, respuesta correcta, justificacion
- Filtros: "Solo errores", "Solo marcadas", "Todas"
- Colores: verde (acertada), rojo (fallada), gris (en blanco)

### 7. Estadisticas (`/estadisticas`)
- 5 KPIs: examenes, tasa acierto, respuestas totales, preguntas vistas (de 200), preguntas debiles
- Grafico linea/barras: evolucion tasa de acierto en el tiempo (Recharts)
- Barras horizontales: rendimiento por tema con colores (verde >75%, amarillo 50-75%, rojo <50%)
- Heatmap de actividad: calendario estilo GitHub, ultimos 3 meses, intensidad = preguntas respondidas ese dia

### 8. Informe de Preguntas (`/estadisticas/preguntas`)
- Tabla con todas las 200 preguntas
- Columnas: #, extracto pregunta, veces vista, aciertos, errores, % error
- Filtros: todas, solo debiles, nunca vistas, por tema
- Ordenacion: mas falladas, menos falladas, por numero

### 9. Historial de Examenes (`/historial`)
- Tabla cronologica de todos los examenes/sesiones
- Columnas: fecha, modo (badge color), n° preguntas, aciertos (% y absoluto), nota penalizada (solo examen), tiempo, enlace "Ver detalle"
- Detalle: redirige a la pantalla de revision del examen

---

## Formula de Puntuacion

La formula estandar de OPE Osakidetza:

```
nota_penalizada = aciertos - (errores / 3)
porcentaje = (nota_penalizada / total_preguntas) * 100
```

- Cada acierto: +1 punto
- Cada error: -1/3 punto
- En blanco: 0 puntos
- Solo aplica en modo Examen

---

## Tema Visual

- Tailwind CSS con next-themes
- Toggle claro/oscuro accesible desde la barra de navegacion
- Paleta de colores funcionales:
  - Verde (#34d399 / #059669): correcto, positivo
  - Rojo (#f87171 / #dc2626): incorrecto, negativo
  - Amarillo (#fbbf24 / #f59e0b): duda, advertencia, rango medio
  - Azul (#60a5fa / #2563eb): actual, seleccion, accion primaria
  - Gris (#94a3b8 / #475569): sin responder, inactivo
- Responsive: funciona en movil, tablet y desktop
- Interfaz en castellano

---

## Datos Iniciales

Las 200 preguntas se cargan desde:
- **Enunciados y opciones**: PDF `200-Galdera-sorta_TEMARIO-COMUN_cas.pdf` (parseado a JSON)
- **Respuestas y justificaciones**: `RESPUESTAS-BATERIA-COMUN.md` (parseado a JSON)
- Se crea un script de seed que genera el JSON y lo inserta en la base de datos

---

## Verificacion

1. **Seed de datos**: ejecutar script de seed y verificar que las 200 preguntas se insertan correctamente con sus respuestas y justificaciones
2. **Login**: verificar acceso con credenciales correctas e incorrectas
3. **Modo Examen**: crear examen de 10 preguntas, responder, verificar nota penalizada correcta
4. **Modo Estudio**: iniciar sesion, responder, verificar correccion inmediata con justificacion
5. **Estadisticas**: tras varios examenes, verificar que los graficos y KPIs se actualizan
6. **Preguntas debiles**: verificar que el modo "Reforzar Puntos Debiles" prioriza preguntas con alto error_rate
7. **Historial**: verificar que todos los examenes aparecen con datos correctos
8. **Responsive**: probar en movil y desktop
9. **Tema oscuro/claro**: verificar toggle funciona correctamente
