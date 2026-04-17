/**
 * Datos hiperlocales de las 52 comunas de la Región Metropolitana de Chile.
 *
 * Cada comuna incluye información ÚNICA que diferencia su landing page
 * (descripción local, cementerios cercanos, comunas vecinas, FAQ contextual)
 * para evitar contenido duplicado y maximizar SEO/AEO/GEO/LLMO hiperlocal.
 *
 * Coordenadas: aproximadas al centro cívico de la comuna (lat, lng) — usadas
 * en el schema LocalBusiness y en el mapa OpenStreetMap embebido.
 */

export interface ComunaData {
  slug: string;
  nombre: string;
  provincia: string;
  habitantesAprox: number; // miles
  descripcion: string; // 2-3 frases únicas, naturales
  cementerios: string[]; // cementerios o parques cementerio cercanos
  vecinas: string[]; // slugs de comunas vecinas
  faq: { q: string; a: string }[]; // 2-3 preguntas hiperlocales
  lat: number;
  lng: number;
}

export const COMUNAS_RM: ComunaData[] = [
  // ===== Provincia de Santiago =====
  {
    slug: "santiago",
    nombre: "Santiago",
    provincia: "Santiago",
    habitantesAprox: 503,
    descripcion:
      "Santiago Centro concentra los principales hospitales, juzgados y oficinas del Registro Civil de la capital, lo que facilita la coordinación de trámites funerarios urgentes durante las primeras horas tras un fallecimiento.",
    cementerios: ["Cementerio General de Santiago", "Cementerio Católico"],
    vecinas: ["providencia", "independencia", "recoleta", "estacion-central", "san-miguel", "san-joaquin"],
    faq: [
      {
        q: "¿Atienden funerales en clínicas y hospitales del centro de Santiago?",
        a: "Sí. Coordinamos retiros, traslados y trámites en Hospital Clínico, Hospital del Salvador, San Borja Arriarán, San Juan de Dios y todas las clínicas privadas del eje Alameda–Providencia.",
      },
      {
        q: "¿Hacen trámites en el Registro Civil de Catedral?",
        a: "Sí. Gestionamos la inscripción de defunción en la oficina central del Registro Civil sin que la familia tenga que asistir presencialmente.",
      },
    ],
    lat: -33.4489,
    lng: -70.6693,
  },
  {
    slug: "providencia",
    nombre: "Providencia",
    provincia: "Santiago",
    habitantesAprox: 158,
    descripcion:
      "Providencia es una comuna residencial y de oficinas con alta densidad de adultos mayores. Coordinamos servicios funerarios discretos, con velatorios privados y atención a clínicas del sector como Indisa, Santa María y Alemana.",
    cementerios: ["Cementerio General", "Parque del Recuerdo Américo Vespucio"],
    vecinas: ["santiago", "nunoa", "las-condes", "vitacura", "recoleta"],
    faq: [
      {
        q: "¿Pueden coordinar el retiro desde Clínica Indisa o Clínica Santa María?",
        a: "Sí. Tenemos protocolo de retiro 24/7 con todas las clínicas de Providencia, con la documentación gestionada en menos de 6 horas.",
      },
    ],
    lat: -33.4314,
    lng: -70.6093,
  },
  {
    slug: "las-condes",
    nombre: "Las Condes",
    provincia: "Santiago",
    habitantesAprox: 330,
    descripcion:
      "Las Condes ofrece una alta demanda de servicios funerarios premium con velatorios privados en domicilio o capilla. Atendemos retiros desde Clínica Las Condes, Clínica Alemana y Clínica MEDS con protocolo discreto.",
    cementerios: ["Parque del Recuerdo Américo Vespucio", "Parque del Recuerdo Cordillera"],
    vecinas: ["providencia", "vitacura", "lo-barnechea", "la-reina", "nunoa"],
    faq: [
      {
        q: "¿Realizan velatorios privados en condominios de Las Condes?",
        a: "Sí. Coordinamos velatorios privados en condominios y casas particulares con todo el equipamiento (capilla ardiente, flores, libro de condolencias y atención a invitados).",
      },
      {
        q: "¿Atienden clínicas de Las Condes en horario nocturno?",
        a: "Sí, 24/7 todo el año. Retiros en menos de 90 minutos desde Clínica Las Condes, Alemana, MEDS y Vespucio.",
      },
    ],
    lat: -33.4101,
    lng: -70.5685,
  },
  {
    slug: "vitacura",
    nombre: "Vitacura",
    provincia: "Santiago",
    habitantesAprox: 96,
    descripcion:
      "Vitacura combina barrios residenciales tranquilos con clínicas de alta complejidad. Ofrecemos servicios funerarios discretos con coordinación directa a Parque del Recuerdo y velatorios privados domiciliarios.",
    cementerios: ["Parque del Recuerdo Américo Vespucio", "Parque del Recuerdo Cordillera"],
    vecinas: ["las-condes", "lo-barnechea", "huechuraba", "providencia"],
    faq: [
      {
        q: "¿Manejan coordinación con Parque del Recuerdo desde Vitacura?",
        a: "Sí. Tenemos canal directo con Parque del Recuerdo Américo Vespucio y Cordillera para reservas el mismo día.",
      },
    ],
    lat: -33.3823,
    lng: -70.5906,
  },
  {
    slug: "lo-barnechea",
    nombre: "Lo Barnechea",
    provincia: "Santiago",
    habitantesAprox: 110,
    descripcion:
      "Lo Barnechea abarca desde La Dehesa hasta Farellones. Atendemos servicios funerarios en toda la comuna, incluyendo sectores precordilleranos con tiempos de respuesta optimizados durante temporada de nieve.",
    cementerios: ["Parque del Recuerdo Cordillera", "Parque del Recuerdo Américo Vespucio"],
    vecinas: ["vitacura", "las-condes", "huechuraba", "colina"],
    faq: [
      {
        q: "¿Cubren sectores precordilleranos como La Dehesa y El Arrayán?",
        a: "Sí. Tenemos vehículos preparados para acceder a condominios de La Dehesa, El Arrayán y zonas de Farellones durante todo el año.",
      },
    ],
    lat: -33.3501,
    lng: -70.5179,
  },
  {
    slug: "nunoa",
    nombre: "Ñuñoa",
    provincia: "Santiago",
    habitantesAprox: 250,
    descripcion:
      "Ñuñoa es una comuna familiar con fuerte presencia de adultos mayores en Plaza Ñuñoa, Villa Frei y Estadio Nacional. Coordinamos servicios funerarios con velatorios en domicilio o iglesia parroquial.",
    cementerios: ["Cementerio General", "Cementerio Católico", "Parque del Recuerdo"],
    vecinas: ["providencia", "las-condes", "la-reina", "macul", "san-joaquin", "santiago"],
    faq: [
      {
        q: "¿Coordinan misas funerarias en parroquias de Ñuñoa?",
        a: "Sí. Tenemos coordinación con parroquias del sector Plaza Ñuñoa, Suecia y Villa Frei para misas de cuerpo presente.",
      },
    ],
    lat: -33.4569,
    lng: -70.5933,
  },
  {
    slug: "la-reina",
    nombre: "La Reina",
    provincia: "Santiago",
    habitantesAprox: 96,
    descripcion:
      "La Reina ofrece un entorno residencial con buena conectividad hacia el Cementerio Parroquial y los parques cementerio del sector oriente. Atendemos servicios funerarios con sensibilidad y rapidez.",
    cementerios: ["Parque del Recuerdo Américo Vespucio", "Cementerio Parroquial La Reina"],
    vecinas: ["las-condes", "nunoa", "penalolen", "macul"],
    faq: [
      {
        q: "¿Pueden coordinar sepultación en el Cementerio Parroquial La Reina?",
        a: "Sí. Gestionamos reserva, traslado y ceremonia en el Cementerio Parroquial La Reina y otros camposantos del sector oriente.",
      },
    ],
    lat: -33.4470,
    lng: -70.5417,
  },
  {
    slug: "macul",
    nombre: "Macul",
    provincia: "Santiago",
    habitantesAprox: 117,
    descripcion:
      "Macul es una comuna con fuerte identidad barrial, hogar de la Universidad Católica San Joaquín y sectores residenciales tradicionales. Atendemos servicios funerarios con velatorios cercanos y trámites coordinados.",
    cementerios: ["Cementerio Parroquial Santo Tomás", "Cementerio General"],
    vecinas: ["nunoa", "penalolen", "san-joaquin", "la-florida"],
    faq: [
      {
        q: "¿Atienden urgencias en el Hospital Sótero del Río desde Macul?",
        a: "Sí. Coordinamos retiros y traslados desde Sótero del Río y otros centros asistenciales del sector sur.",
      },
    ],
    lat: -33.4934,
    lng: -70.5994,
  },
  {
    slug: "penalolen",
    nombre: "Peñalolén",
    provincia: "Santiago",
    habitantesAprox: 266,
    descripcion:
      "Peñalolén combina sectores precordilleranos como Lo Hermida y zonas residenciales tradicionales. Atendemos toda la comuna, desde la Avenida Grecia hasta los condominios cercanos al Parque Quebrada de Macul.",
    cementerios: ["Cementerio Parroquial Santo Tomás", "Parque del Recuerdo Cordillera"],
    vecinas: ["la-reina", "nunoa", "macul", "la-florida"],
    faq: [
      {
        q: "¿Cubren sectores como Lo Hermida y San Luis de Macul?",
        a: "Sí. Atendemos toda la comuna de Peñalolén con la misma rapidez, incluyendo Lo Hermida, San Luis y Quebrada de Macul.",
      },
    ],
    lat: -33.4869,
    lng: -70.5360,
  },
  {
    slug: "la-florida",
    nombre: "La Florida",
    provincia: "Santiago",
    habitantesAprox: 366,
    descripcion:
      "La Florida es una de las comunas más pobladas de Santiago, con el Hospital Sótero del Río como principal centro asistencial. Coordinamos servicios funerarios con respuesta inmediata 24/7.",
    cementerios: ["Cementerio Parroquial Santo Tomás", "Cementerio Metropolitano"],
    vecinas: ["puente-alto", "macul", "penalolen", "la-granja", "san-jose-de-maipo"],
    faq: [
      {
        q: "¿Retiran cuerpos desde el Hospital Sótero del Río?",
        a: "Sí. Tenemos protocolo de retiro permanente desde Sótero del Río con trámites en menos de 6 horas.",
      },
    ],
    lat: -33.5223,
    lng: -70.5985,
  },
  {
    slug: "san-joaquin",
    nombre: "San Joaquín",
    provincia: "Santiago",
    habitantesAprox: 90,
    descripcion:
      "San Joaquín alberga al Hospital Barros Luco, uno de los centros asistenciales más importantes del sur de Santiago. Atendemos servicios funerarios con coordinación directa a sus dependencias.",
    cementerios: ["Cementerio Metropolitano", "Cementerio General"],
    vecinas: ["nunoa", "macul", "san-miguel", "san-ramon", "la-granja"],
    faq: [
      {
        q: "¿Coordinan retiros desde el Hospital Barros Luco?",
        a: "Sí, 24/7. Tenemos canal directo con Anatomía Patológica y trámites coordinados con el Registro Civil.",
      },
    ],
    lat: -33.4969,
    lng: -70.6286,
  },
  {
    slug: "san-miguel",
    nombre: "San Miguel",
    provincia: "Santiago",
    habitantesAprox: 130,
    descripcion:
      "San Miguel es una comuna residencial con fuerte presencia de adultos mayores y conectividad directa al Cementerio Metropolitano. Ofrecemos servicios funerarios con velatorios cercanos y trámites ágiles.",
    cementerios: ["Cementerio Metropolitano", "Cementerio General"],
    vecinas: ["santiago", "san-joaquin", "la-cisterna", "lo-espejo", "pedro-aguirre-cerda"],
    faq: [
      {
        q: "¿Trabajan con el Cementerio Metropolitano?",
        a: "Sí. Gestionamos sepulturas, nichos y cremación en Cementerio Metropolitano con coordinación directa.",
      },
    ],
    lat: -33.4956,
    lng: -70.6519,
  },
  {
    slug: "la-cisterna",
    nombre: "La Cisterna",
    provincia: "Santiago",
    habitantesAprox: 92,
    descripcion:
      "La Cisterna es nodo de transporte del sur de Santiago. Atendemos servicios funerarios con respuesta rápida gracias a su conectividad con la Autopista Central y la línea 2 del Metro.",
    cementerios: ["Cementerio Metropolitano", "Cementerio Parque del Sendero"],
    vecinas: ["san-miguel", "lo-espejo", "el-bosque", "san-ramon"],
    faq: [
      {
        q: "¿Cuánto demoran en llegar a La Cisterna desde una urgencia?",
        a: "Promedio de 45 a 60 minutos en horario diurno y bajo 90 minutos en horario nocturno gracias a la Autopista Central.",
      },
    ],
    lat: -33.5333,
    lng: -70.6644,
  },
  {
    slug: "el-bosque",
    nombre: "El Bosque",
    provincia: "Santiago",
    habitantesAprox: 162,
    descripcion:
      "El Bosque cuenta con el Cementerio Parque del Sendero como camposanto principal. Atendemos servicios funerarios completos con coordinación directa y planes accesibles para familias del sector.",
    cementerios: ["Cementerio Parque del Sendero", "Cementerio Metropolitano"],
    vecinas: ["la-cisterna", "san-ramon", "la-pintana", "san-bernardo"],
    faq: [
      {
        q: "¿Trabajan con Parque del Sendero?",
        a: "Sí. Tenemos convenio operativo con Parque del Sendero para sepultación y cremación con disponibilidad rápida.",
      },
    ],
    lat: -33.5594,
    lng: -70.6749,
  },
  {
    slug: "la-pintana",
    nombre: "La Pintana",
    provincia: "Santiago",
    habitantesAprox: 178,
    descripcion:
      "La Pintana es una comuna del sur de Santiago con fuerte demanda de planes funerarios accesibles. Ofrecemos servicios completos con financiamiento flexible y atención cercana.",
    cementerios: ["Cementerio Parque del Sendero", "Cementerio Metropolitano"],
    vecinas: ["el-bosque", "san-ramon", "san-bernardo", "puente-alto"],
    faq: [
      {
        q: "¿Tienen planes funerarios accesibles para La Pintana?",
        a: "Sí. Contamos con planes desde precios solidarios y opciones de financiamiento sin recargos.",
      },
    ],
    lat: -33.5836,
    lng: -70.6336,
  },
  {
    slug: "san-ramon",
    nombre: "San Ramón",
    provincia: "Santiago",
    habitantesAprox: 80,
    descripcion:
      "San Ramón es una comuna residencial del sector sur. Coordinamos servicios funerarios con velatorios en parroquias locales y traslados a los principales camposantos del sector.",
    cementerios: ["Cementerio Metropolitano", "Cementerio Parque del Sendero"],
    vecinas: ["san-joaquin", "la-cisterna", "el-bosque", "la-granja", "la-pintana"],
    faq: [
      {
        q: "¿Hacen velatorios en domicilios pequeños?",
        a: "Sí. Adaptamos el equipamiento al espacio disponible para velatorios dignos en cualquier domicilio.",
      },
    ],
    lat: -33.5409,
    lng: -70.6438,
  },
  {
    slug: "la-granja",
    nombre: "La Granja",
    provincia: "Santiago",
    habitantesAprox: 116,
    descripcion:
      "La Granja es una comuna familiar del sector sur. Atendemos servicios funerarios con coordinación a parroquias y camposantos cercanos, ofreciendo planes ajustados al presupuesto familiar.",
    cementerios: ["Cementerio Metropolitano", "Cementerio Parque del Sendero"],
    vecinas: ["san-joaquin", "san-ramon", "la-florida", "san-bernardo"],
    faq: [
      {
        q: "¿Coordinan misas en parroquias de La Granja?",
        a: "Sí. Gestionamos misas de cuerpo presente y responsos en las parroquias de la comuna.",
      },
    ],
    lat: -33.5378,
    lng: -70.6243,
  },
  {
    slug: "pedro-aguirre-cerda",
    nombre: "Pedro Aguirre Cerda",
    provincia: "Santiago",
    habitantesAprox: 101,
    descripcion:
      "Pedro Aguirre Cerda concentra barrios tradicionales del sur poniente de Santiago. Atendemos servicios funerarios con tiempos de respuesta rápidos y planes adaptados a la realidad familiar de la comuna.",
    cementerios: ["Cementerio Metropolitano", "Cementerio General"],
    vecinas: ["san-miguel", "lo-espejo", "cerrillos", "estacion-central"],
    faq: [
      {
        q: "¿Cuánto cuesta un servicio funerario básico en PAC?",
        a: "Tenemos planes desde precios solidarios. Solicite cotización y le respondemos en menos de 24 horas con todo incluido.",
      },
    ],
    lat: -33.4900,
    lng: -70.6750,
  },
  {
    slug: "lo-espejo",
    nombre: "Lo Espejo",
    provincia: "Santiago",
    habitantesAprox: 100,
    descripcion:
      "Lo Espejo es una comuna del sur poniente con fuerte arraigo barrial. Ofrecemos servicios funerarios completos con planes accesibles y atención cercana las 24 horas.",
    cementerios: ["Cementerio Metropolitano", "Cementerio Parque del Sendero"],
    vecinas: ["pedro-aguirre-cerda", "san-miguel", "la-cisterna", "san-bernardo", "cerrillos"],
    faq: [
      {
        q: "¿Atienden urgencias nocturnas en Lo Espejo?",
        a: "Sí, las 24 horas todo el año. Llame al +56 9 6433 3760 y enviamos equipo en menos de 90 minutos.",
      },
    ],
    lat: -33.5236,
    lng: -70.6917,
  },
  {
    slug: "cerrillos",
    nombre: "Cerrillos",
    provincia: "Santiago",
    habitantesAprox: 82,
    descripcion:
      "Cerrillos vive una renovación urbana con nuevos barrios residenciales. Atendemos servicios funerarios con coordinación a clínicas del sector poniente y planes para todos los presupuestos.",
    cementerios: ["Cementerio Metropolitano", "Cementerio General"],
    vecinas: ["estacion-central", "maipu", "lo-espejo", "pedro-aguirre-cerda"],
    faq: [
      {
        q: "¿Cubren los nuevos condominios de Ciudad Parque Bicentenario?",
        a: "Sí. Atendemos todos los barrios de Cerrillos, incluyendo los desarrollos del Parque Bicentenario.",
      },
    ],
    lat: -33.4949,
    lng: -70.7152,
  },
  {
    slug: "estacion-central",
    nombre: "Estación Central",
    provincia: "Santiago",
    habitantesAprox: 147,
    descripcion:
      "Estación Central es un nodo de transporte clave que facilita el acceso a clínicas del sector como San Juan de Dios. Coordinamos servicios funerarios urgentes con tiempos de respuesta optimizados.",
    cementerios: ["Cementerio General", "Cementerio Metropolitano"],
    vecinas: ["santiago", "quinta-normal", "cerrillos", "maipu", "pedro-aguirre-cerda"],
    faq: [
      {
        q: "¿Coordinan retiros desde el Hospital San Juan de Dios?",
        a: "Sí. Tenemos protocolo de retiro 24/7 con el Hospital San Juan de Dios.",
      },
    ],
    lat: -33.4583,
    lng: -70.6789,
  },
  {
    slug: "quinta-normal",
    nombre: "Quinta Normal",
    provincia: "Santiago",
    habitantesAprox: 110,
    descripcion:
      "Quinta Normal combina barrios tradicionales con cercanía al Cementerio General. Atendemos servicios funerarios con coordinación directa al principal camposanto histórico de Santiago.",
    cementerios: ["Cementerio General", "Cementerio Metropolitano"],
    vecinas: ["santiago", "estacion-central", "lo-prado", "cerro-navia", "renca", "independencia"],
    faq: [
      {
        q: "¿Trabajan con sepulturas familiares en el Cementerio General?",
        a: "Sí. Gestionamos apertura de sepulturas familiares, nichos y traslados al Cementerio General.",
      },
    ],
    lat: -33.4283,
    lng: -70.7019,
  },
  {
    slug: "lo-prado",
    nombre: "Lo Prado",
    provincia: "Santiago",
    habitantesAprox: 96,
    descripcion:
      "Lo Prado es una comuna familiar del sector poniente con buena conectividad por Autopista Costanera Norte. Ofrecemos servicios funerarios accesibles con coordinación cercana.",
    cementerios: ["Cementerio General", "Cementerio Metropolitano"],
    vecinas: ["quinta-normal", "cerro-navia", "pudahuel"],
    faq: [
      {
        q: "¿Pueden hacer velatorios en sedes vecinales?",
        a: "Sí. Coordinamos velatorios en sedes vecinales y centros comunitarios cuando es necesario por espacio.",
      },
    ],
    lat: -33.4453,
    lng: -70.7211,
  },
  {
    slug: "cerro-navia",
    nombre: "Cerro Navia",
    provincia: "Santiago",
    habitantesAprox: 132,
    descripcion:
      "Cerro Navia es una comuna popular del sector poniente con fuerte identidad comunitaria. Atendemos servicios funerarios con planes solidarios y trámites totalmente gestionados.",
    cementerios: ["Cementerio General", "Cementerio Metropolitano"],
    vecinas: ["lo-prado", "pudahuel", "renca", "quinta-normal"],
    faq: [
      {
        q: "¿Tienen opciones de pago en cuotas?",
        a: "Sí. Ofrecemos planes con pago en cuotas sin intereses para familias de Cerro Navia.",
      },
    ],
    lat: -33.4239,
    lng: -70.7322,
  },
  {
    slug: "pudahuel",
    nombre: "Pudahuel",
    provincia: "Santiago",
    habitantesAprox: 247,
    descripcion:
      "Pudahuel abarca desde el sector urbano hasta los alrededores del Aeropuerto SCL. Cubrimos toda la comuna con vehículos preparados para distancias mayores y atención 24/7.",
    cementerios: ["Cementerio General", "Cementerio Metropolitano", "Parque del Recuerdo"],
    vecinas: ["lo-prado", "cerro-navia", "renca", "quilicura", "maipu"],
    faq: [
      {
        q: "¿Atienden el sector de Pudahuel Sur y zonas cercanas al aeropuerto?",
        a: "Sí. Cubrimos toda Pudahuel, incluyendo Pudahuel Sur, Peñaflor Norte y zonas industriales cercanas a SCL.",
      },
    ],
    lat: -33.4413,
    lng: -70.7558,
  },
  {
    slug: "renca",
    nombre: "Renca",
    provincia: "Santiago",
    habitantesAprox: 147,
    descripcion:
      "Renca es una comuna del sector norponiente con buena conectividad por Vespucio Norte. Ofrecemos servicios funerarios completos con coordinación a clínicas y camposantos del norte de Santiago.",
    cementerios: ["Cementerio General", "Parque del Recuerdo Américo Vespucio"],
    vecinas: ["quinta-normal", "cerro-navia", "pudahuel", "quilicura", "huechuraba", "conchali"],
    faq: [
      {
        q: "¿Cuánto demoran en llegar a Renca de noche?",
        a: "Promedio de 60 a 75 minutos durante la madrugada gracias a Vespucio Norte.",
      },
    ],
    lat: -33.4044,
    lng: -70.7228,
  },
  {
    slug: "quilicura",
    nombre: "Quilicura",
    provincia: "Santiago",
    habitantesAprox: 230,
    descripcion:
      "Quilicura es una comuna en crecimiento con nuevos barrios residenciales y polo industrial. Atendemos toda la comuna, incluyendo condominios nuevos y sectores tradicionales como San Luis.",
    cementerios: ["Parque del Recuerdo Américo Vespucio", "Cementerio General"],
    vecinas: ["renca", "huechuraba", "colina", "pudahuel"],
    faq: [
      {
        q: "¿Cubren los nuevos condominios de Quilicura Sur?",
        a: "Sí. Atendemos toda la comuna, incluyendo los nuevos desarrollos residenciales de Quilicura Sur y San Luis.",
      },
    ],
    lat: -33.3631,
    lng: -70.7286,
  },
  {
    slug: "huechuraba",
    nombre: "Huechuraba",
    provincia: "Santiago",
    habitantesAprox: 110,
    descripcion:
      "Huechuraba combina parques empresariales con barrios residenciales en torno a Ciudad Empresarial y Pedro Fontova. Atendemos servicios funerarios con respuesta rápida desde el sector norte.",
    cementerios: ["Parque del Recuerdo Américo Vespucio", "Parque del Recuerdo Cordillera"],
    vecinas: ["recoleta", "conchali", "quilicura", "vitacura", "lo-barnechea", "renca"],
    faq: [
      {
        q: "¿Atienden sectores como Pedro Fontova y Ciudad Empresarial?",
        a: "Sí. Tenemos cobertura permanente en Pedro Fontova, Ciudad Empresarial y barrios residenciales de Huechuraba.",
      },
    ],
    lat: -33.3741,
    lng: -70.6385,
  },
  {
    slug: "conchali",
    nombre: "Conchalí",
    provincia: "Santiago",
    habitantesAprox: 126,
    descripcion:
      "Conchalí es una comuna del sector norte con fuerte tradición barrial. Atendemos servicios funerarios con cercanía y planes accesibles para todas las familias.",
    cementerios: ["Cementerio General", "Parque del Recuerdo Américo Vespucio"],
    vecinas: ["independencia", "huechuraba", "recoleta", "renca", "quilicura"],
    faq: [
      {
        q: "¿Trabajan con sepulturas familiares en Cementerio General desde Conchalí?",
        a: "Sí. Gestionamos apertura, traslado y trámites de sepulturas familiares con coordinación directa.",
      },
    ],
    lat: -33.3833,
    lng: -70.6747,
  },
  {
    slug: "independencia",
    nombre: "Independencia",
    provincia: "Santiago",
    habitantesAprox: 100,
    descripcion:
      "Independencia alberga al Hospital J.J. Aguirre y la Facultad de Medicina de la U. de Chile. Coordinamos servicios funerarios con respuesta inmediata en uno de los nodos médicos más importantes de Santiago.",
    cementerios: ["Cementerio General", "Cementerio Católico"],
    vecinas: ["santiago", "recoleta", "conchali", "renca"],
    faq: [
      {
        q: "¿Coordinan retiros desde el Hospital Clínico de la U. de Chile (J.J. Aguirre)?",
        a: "Sí, 24/7. Tenemos protocolo de retiro permanente con J.J. Aguirre y otros centros del sector.",
      },
    ],
    lat: -33.4156,
    lng: -70.6628,
  },
  {
    slug: "recoleta",
    nombre: "Recoleta",
    provincia: "Santiago",
    habitantesAprox: 158,
    descripcion:
      "Recoleta concentra el Cementerio General, el Cementerio Católico y el Patronato. Atendemos servicios funerarios con la ventaja logística de tener los principales camposantos de Santiago en su territorio.",
    cementerios: ["Cementerio General", "Cementerio Católico", "Cementerio Israelita"],
    vecinas: ["independencia", "santiago", "providencia", "huechuraba", "conchali"],
    faq: [
      {
        q: "¿Atienden el Cementerio Israelita y otros camposantos religiosos?",
        a: "Sí. Coordinamos servicios respetando los ritos del Cementerio Israelita, Católico y otros camposantos confesionales.",
      },
    ],
    lat: -33.4030,
    lng: -70.6422,
  },
  // ===== Provincia de Cordillera =====
  {
    slug: "puente-alto",
    nombre: "Puente Alto",
    provincia: "Cordillera",
    habitantesAprox: 645,
    descripcion:
      "Puente Alto es la comuna más poblada de Chile con casi 650 mil habitantes. Atendemos toda la comuna 24/7 con vehículos asignados de forma permanente para garantizar tiempos de respuesta cortos.",
    cementerios: ["Parque del Recuerdo Cordillera", "Cementerio Parque del Sendero"],
    vecinas: ["la-florida", "la-pintana", "san-bernardo", "pirque", "san-jose-de-maipo"],
    faq: [
      {
        q: "¿Tienen cobertura en sectores como Bajos de Mena y San Carlos de Apoquindo?",
        a: "Sí. Cubrimos todos los barrios de Puente Alto, incluyendo Bajos de Mena, Las Vizcachas y sectores residenciales.",
      },
      {
        q: "¿Coordinan retiros desde el Hospital Sótero del Río?",
        a: "Sí, las 24 horas. Sótero del Río atiende a Puente Alto y tenemos protocolo de retiro permanente.",
      },
    ],
    lat: -33.6107,
    lng: -70.5755,
  },
  {
    slug: "pirque",
    nombre: "Pirque",
    provincia: "Cordillera",
    habitantesAprox: 28,
    descripcion:
      "Pirque es una comuna rural en el sector precordillerano del sur. Atendemos servicios funerarios con vehículos preparados para distancias mayores y caminos rurales.",
    cementerios: ["Cementerio Parroquial de Pirque", "Parque del Recuerdo Cordillera"],
    vecinas: ["puente-alto", "san-jose-de-maipo"],
    faq: [
      {
        q: "¿Atienden sectores rurales de Pirque?",
        a: "Sí. Tenemos vehículos preparados para acceder a parcelas y sectores rurales de Pirque y el Cajón del Maipo.",
      },
    ],
    lat: -33.6394,
    lng: -70.5897,
  },
  {
    slug: "san-jose-de-maipo",
    nombre: "San José de Maipo",
    provincia: "Cordillera",
    habitantesAprox: 18,
    descripcion:
      "San José de Maipo cubre el Cajón del Maipo desde Las Vertientes hasta Lo Valdés. Coordinamos servicios funerarios con experiencia en zonas cordilleranas y caminos de montaña.",
    cementerios: ["Cementerio de San José de Maipo", "Parque del Recuerdo Cordillera"],
    vecinas: ["puente-alto", "pirque", "la-florida"],
    faq: [
      {
        q: "¿Pueden llegar a sectores como El Volcán y Baños Morales?",
        a: "Sí. Atendemos todo el Cajón del Maipo, evaluando condiciones de camino en cada caso.",
      },
    ],
    lat: -33.6447,
    lng: -70.3522,
  },
  // ===== Provincia de Maipo =====
  {
    slug: "maipu",
    nombre: "Maipú",
    provincia: "Santiago",
    habitantesAprox: 580,
    descripcion:
      "Maipú es la segunda comuna más poblada de Chile y un eje histórico del sector poniente. Atendemos toda la comuna con velatorios cercanos al Templo Votivo y planes adaptados a cada familia.",
    cementerios: ["Cementerio Parroquial de Maipú", "Cementerio Metropolitano", "Parque del Recuerdo"],
    vecinas: ["cerrillos", "estacion-central", "pudahuel", "padre-hurtado", "calera-de-tango"],
    faq: [
      {
        q: "¿Tienen cobertura en Ciudad Satélite, Rinconada y Maipú Centro?",
        a: "Sí. Cubrimos toda la comuna de Maipú con vehículos asignados de forma permanente.",
      },
      {
        q: "¿Pueden hacer velatorios cerca del Templo Votivo?",
        a: "Sí. Coordinamos velatorios y misas en parroquias del sector, incluyendo el Templo Votivo de Maipú.",
      },
    ],
    lat: -33.5106,
    lng: -70.7581,
  },
  {
    slug: "san-bernardo",
    nombre: "San Bernardo",
    provincia: "Maipo",
    habitantesAprox: 312,
    descripcion:
      "San Bernardo es la capital de la Provincia del Maipo. Atendemos toda la comuna, desde el centro histórico hasta los sectores de Nos y Lo Herrera, con planes accesibles y coordinación a camposantos cercanos.",
    cementerios: ["Cementerio Municipal de San Bernardo", "Cementerio Parque del Sendero"],
    vecinas: ["el-bosque", "la-pintana", "puente-alto", "calera-de-tango", "buin"],
    faq: [
      {
        q: "¿Atienden Nos, El Mariscal y Lo Herrera?",
        a: "Sí. Cubrimos todos los sectores de San Bernardo con tiempos de respuesta optimizados.",
      },
    ],
    lat: -33.5921,
    lng: -70.6993,
  },
  {
    slug: "buin",
    nombre: "Buin",
    provincia: "Maipo",
    habitantesAprox: 110,
    descripcion:
      "Buin es una comuna del sur de la Región Metropolitana en pleno crecimiento. Coordinamos servicios funerarios con vehículos preparados para distancias mayores y atención 24/7.",
    cementerios: ["Cementerio Municipal de Buin", "Cementerio Parque del Sendero"],
    vecinas: ["san-bernardo", "paine", "calera-de-tango"],
    faq: [
      {
        q: "¿Cuánto demoran en llegar a Buin desde Santiago?",
        a: "Aproximadamente 50 a 70 minutos por la Autopista del Sol o Acceso Sur, según horario.",
      },
    ],
    lat: -33.7333,
    lng: -70.7456,
  },
  {
    slug: "paine",
    nombre: "Paine",
    provincia: "Maipo",
    habitantesAprox: 75,
    descripcion:
      "Paine es una comuna rural y en crecimiento al sur de la RM. Atendemos toda la comuna con experiencia en sectores rurales y parcelas de agrado, coordinando trámites y traslados.",
    cementerios: ["Cementerio Municipal de Paine", "Cementerio Parque del Sendero"],
    vecinas: ["buin", "calera-de-tango"],
    faq: [
      {
        q: "¿Atienden parcelas rurales de Paine y Hospital?",
        a: "Sí. Tenemos vehículos preparados para sectores rurales y caminos secundarios de Paine.",
      },
    ],
    lat: -33.8094,
    lng: -70.7414,
  },
  {
    slug: "calera-de-tango",
    nombre: "Calera de Tango",
    provincia: "Maipo",
    habitantesAprox: 25,
    descripcion:
      "Calera de Tango es una comuna semirural con parcelas de agrado y sectores residenciales tranquilos. Coordinamos servicios funerarios con cercanía y respeto a la identidad local.",
    cementerios: ["Cementerio Municipal de Calera de Tango", "Cementerio Parque del Sendero"],
    vecinas: ["maipu", "san-bernardo", "buin", "padre-hurtado"],
    faq: [
      {
        q: "¿Atienden sectores rurales de Calera de Tango?",
        a: "Sí. Cubrimos parcelas de agrado y sectores rurales con vehículos preparados.",
      },
    ],
    lat: -33.6353,
    lng: -70.7867,
  },
  // ===== Provincia de Chacabuco =====
  {
    slug: "colina",
    nombre: "Colina",
    provincia: "Chacabuco",
    habitantesAprox: 145,
    descripcion:
      "Colina abarca desde Chicureo hasta Esmeralda, con fuerte crecimiento residencial. Atendemos toda la comuna con vehículos preparados para distancias mayores y coordinación con clínicas del sector norte.",
    cementerios: ["Cementerio Parque Las Rosas", "Parque del Recuerdo Américo Vespucio"],
    vecinas: ["lampa", "tiltil", "huechuraba", "lo-barnechea", "quilicura"],
    faq: [
      {
        q: "¿Atienden los condominios de Chicureo y Piedra Roja?",
        a: "Sí. Cubrimos toda Colina, incluyendo Chicureo, Piedra Roja, Hacienda Chicureo y sectores residenciales de la zona norte.",
      },
    ],
    lat: -33.2017,
    lng: -70.6783,
  },
  {
    slug: "lampa",
    nombre: "Lampa",
    provincia: "Chacabuco",
    habitantesAprox: 120,
    descripcion:
      "Lampa combina sectores rurales con nuevos desarrollos residenciales como Valle Grande y Larapinta. Atendemos toda la comuna con vehículos preparados para mayores distancias.",
    cementerios: ["Cementerio Municipal de Lampa", "Cementerio Parque Las Rosas"],
    vecinas: ["colina", "tiltil", "quilicura", "pudahuel"],
    faq: [
      {
        q: "¿Atienden Valle Grande, Larapinta y Batuco?",
        a: "Sí. Cubrimos todos los sectores de Lampa, incluyendo Valle Grande, Larapinta, Batuco y zonas rurales.",
      },
    ],
    lat: -33.2858,
    lng: -70.8786,
  },
  {
    slug: "tiltil",
    nombre: "Tiltil",
    provincia: "Chacabuco",
    habitantesAprox: 22,
    descripcion:
      "Tiltil es una comuna rural del extremo norte de la RM. Atendemos servicios funerarios con vehículos preparados para distancias mayores y coordinación de trámites en la región.",
    cementerios: ["Cementerio Municipal de Tiltil", "Cementerio Parque Las Rosas"],
    vecinas: ["colina", "lampa"],
    faq: [
      {
        q: "¿Cuánto demoran en llegar a Tiltil?",
        a: "Aproximadamente 70 a 90 minutos desde Santiago Centro, dependiendo del tráfico en la Autopista Los Libertadores.",
      },
    ],
    lat: -33.0833,
    lng: -70.9278,
  },
  // ===== Provincia de Talagante =====
  {
    slug: "talagante",
    nombre: "Talagante",
    provincia: "Talagante",
    habitantesAprox: 78,
    descripcion:
      "Talagante es la capital de su provincia, con fuerte identidad rural y nuevos sectores residenciales. Coordinamos servicios funerarios con cercanía y respeto a las tradiciones locales.",
    cementerios: ["Cementerio Municipal de Talagante", "Cementerio Parroquial"],
    vecinas: ["el-monte", "isla-de-maipo", "padre-hurtado", "penaflor"],
    faq: [
      {
        q: "¿Atienden Talagante y sectores rurales aledaños?",
        a: "Sí. Cubrimos toda la comuna y zonas rurales con vehículos preparados para mayores distancias.",
      },
    ],
    lat: -33.6644,
    lng: -70.9264,
  },
  {
    slug: "el-monte",
    nombre: "El Monte",
    provincia: "Talagante",
    habitantesAprox: 35,
    descripcion:
      "El Monte es una comuna rural con fuerte tradición campesina. Atendemos servicios funerarios con cercanía, coordinando con parroquias locales y camposantos cercanos.",
    cementerios: ["Cementerio Municipal de El Monte", "Cementerio Parroquial"],
    vecinas: ["talagante", "isla-de-maipo", "melipilla"],
    faq: [
      {
        q: "¿Coordinan misas en parroquias rurales de El Monte?",
        a: "Sí. Tenemos coordinación con parroquias locales para misas de cuerpo presente y responsos.",
      },
    ],
    lat: -33.6786,
    lng: -71.0008,
  },
  {
    slug: "isla-de-maipo",
    nombre: "Isla de Maipo",
    provincia: "Talagante",
    habitantesAprox: 38,
    descripcion:
      "Isla de Maipo es una comuna rural con producción vitivinícola y fuerte identidad campesina. Coordinamos servicios funerarios con cercanía y respeto a las tradiciones locales.",
    cementerios: ["Cementerio Municipal de Isla de Maipo", "Cementerio Parroquial"],
    vecinas: ["talagante", "el-monte", "padre-hurtado"],
    faq: [
      {
        q: "¿Atienden parcelas y viñedos rurales de Isla de Maipo?",
        a: "Sí. Cubrimos toda la comuna con vehículos preparados para caminos rurales.",
      },
    ],
    lat: -33.7531,
    lng: -70.9083,
  },
  {
    slug: "padre-hurtado",
    nombre: "Padre Hurtado",
    provincia: "Talagante",
    habitantesAprox: 65,
    descripcion:
      "Padre Hurtado conecta el sector poniente de Santiago con la Provincia de Talagante. Atendemos servicios funerarios con tiempos de respuesta optimizados gracias a su cercanía con Maipú.",
    cementerios: ["Cementerio Municipal de Padre Hurtado", "Cementerio Parque del Sendero"],
    vecinas: ["maipu", "calera-de-tango", "penaflor", "talagante"],
    faq: [
      {
        q: "¿Cuánto demoran en llegar desde Santiago?",
        a: "Aproximadamente 40 a 55 minutos por Camino a Melipilla o Autopista del Sol.",
      },
    ],
    lat: -33.5719,
    lng: -70.8222,
  },
  {
    slug: "penaflor",
    nombre: "Peñaflor",
    provincia: "Talagante",
    habitantesAprox: 95,
    descripcion:
      "Peñaflor es una comuna del sector poniente con identidad propia y fuerte arraigo barrial. Atendemos toda la comuna con planes accesibles y coordinación a camposantos cercanos.",
    cementerios: ["Cementerio Municipal de Peñaflor", "Cementerio Parque del Sendero"],
    vecinas: ["padre-hurtado", "talagante"],
    faq: [
      {
        q: "¿Atienden urgencias nocturnas en Peñaflor?",
        a: "Sí, las 24 horas. Llame al +56 9 6433 3760 y coordinamos retiro inmediato.",
      },
    ],
    lat: -33.6086,
    lng: -70.8786,
  },
  // ===== Provincia de Melipilla =====
  {
    slug: "melipilla",
    nombre: "Melipilla",
    provincia: "Melipilla",
    habitantesAprox: 130,
    descripcion:
      "Melipilla es la capital de su provincia, ubicada al poniente de la RM. Coordinamos servicios funerarios con vehículos preparados para distancias mayores y trámites totalmente gestionados.",
    cementerios: ["Cementerio Municipal de Melipilla", "Cementerio Parroquial"],
    vecinas: ["maria-pinto", "san-pedro", "alhue", "curacavi", "el-monte"],
    faq: [
      {
        q: "¿Atienden todos los sectores de Melipilla?",
        a: "Sí. Cubrimos Melipilla urbana, Bollenar, Pomaire, Codigua y sectores rurales.",
      },
    ],
    lat: -33.6878,
    lng: -71.2156,
  },
  {
    slug: "curacavi",
    nombre: "Curacaví",
    provincia: "Melipilla",
    habitantesAprox: 38,
    descripcion:
      "Curacaví es una comuna rural en la ruta a Valparaíso. Atendemos servicios funerarios con vehículos preparados para distancias mayores y coordinación rápida con Santiago.",
    cementerios: ["Cementerio Municipal de Curacaví", "Cementerio Parroquial"],
    vecinas: ["melipilla", "maria-pinto"],
    faq: [
      {
        q: "¿Cuánto demoran en llegar a Curacaví?",
        a: "Aproximadamente 60 a 75 minutos por la Ruta 68 desde Santiago.",
      },
    ],
    lat: -33.4072,
    lng: -71.1469,
  },
  {
    slug: "maria-pinto",
    nombre: "María Pinto",
    provincia: "Melipilla",
    habitantesAprox: 13,
    descripcion:
      "María Pinto es una comuna rural con baja densidad poblacional. Coordinamos servicios funerarios con experiencia en zonas alejadas y respeto a las tradiciones campesinas.",
    cementerios: ["Cementerio Municipal de María Pinto"],
    vecinas: ["melipilla", "curacavi", "san-pedro"],
    faq: [
      {
        q: "¿Atienden sectores rurales alejados de María Pinto?",
        a: "Sí. Tenemos vehículos preparados para llegar a cualquier sector rural de la comuna.",
      },
    ],
    lat: -33.5328,
    lng: -71.1397,
  },
  {
    slug: "san-pedro",
    nombre: "San Pedro",
    provincia: "Melipilla",
    habitantesAprox: 11,
    descripcion:
      "San Pedro es una comuna rural en el extremo suroeste de la RM. Coordinamos servicios funerarios con vehículos preparados para mayores distancias y caminos rurales.",
    cementerios: ["Cementerio Municipal de San Pedro"],
    vecinas: ["melipilla", "alhue"],
    faq: [
      {
        q: "¿Cuánto demoran en llegar a San Pedro?",
        a: "Aproximadamente 90 a 110 minutos desde Santiago, dependiendo del sector exacto.",
      },
    ],
    lat: -33.8989,
    lng: -71.4631,
  },
  {
    slug: "alhue",
    nombre: "Alhué",
    provincia: "Melipilla",
    habitantesAprox: 7,
    descripcion:
      "Alhué es la comuna más austral de la RM, con tradición minera y rural. Atendemos servicios funerarios con vehículos preparados para distancias mayores y respeto a las tradiciones locales.",
    cementerios: ["Cementerio Municipal de Alhué"],
    vecinas: ["melipilla", "san-pedro"],
    faq: [
      {
        q: "¿Llegan hasta Villa Alhué y Hacienda Alhué?",
        a: "Sí. Cubrimos todos los sectores de la comuna, incluyendo Villa Alhué, Hacienda Alhué y sectores rurales.",
      },
    ],
    lat: -34.0289,
    lng: -71.1011,
  },
];

export const getComunaBySlug = (slug: string): ComunaData | undefined =>
  COMUNAS_RM.find((c) => c.slug === slug);

export const getComunasByProvincia = () => {
  const map = new Map<string, ComunaData[]>();
  for (const c of COMUNAS_RM) {
    if (!map.has(c.provincia)) map.set(c.provincia, []);
    map.get(c.provincia)!.push(c);
  }
  return map;
};

/** Top comunas usadas en widgets de blog y enlaces destacados (mayor demanda). */
export const TOP_COMUNAS_SLUGS = [
  "santiago",
  "providencia",
  "las-condes",
  "nunoa",
  "maipu",
  "puente-alto",
];
