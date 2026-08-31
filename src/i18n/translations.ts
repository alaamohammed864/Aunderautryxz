export type LanguageCode = 'en' | 'es' | 'ar';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  dashboard: string;
  electrical: string;
  ladder: string;
  process3d: string;
  hmi: string;
  scada: string;
  classroom: string;
  assignments: string;
  community: string;
  library: string;
  analytics: string;
  admin: string;
  docs: string;
  run: string;
  stop: string;
  pause: string;
  step: string;
  save: string;
  export: string;
  import: string;
  share: string;
  scanTime: string;
  speed: string;
  dialect: string;
  role: string;
  status: string;
  activeSim: string;
  components: string;
  wires: string;
  rungs: string;
  tags: string;
  alarms: string;
  onlineMonitoring: string;
  forceBit: string;
  energized: string;
  digitalTwinSync: string;
  runAutoGrader: string;
  testsPassed: string;
}

export const TRANSLATIONS: Record<LanguageCode, Translations> = {
  en: {
    appTitle: 'TwinLab Automation',
    appSubtitle: 'Industrial Automation Digital Twin Lab',
    dashboard: 'Dashboard',
    electrical: 'Electrical Circuits',
    ladder: 'PLC Ladder Editor',
    process3d: '3D Digital Twin',
    hmi: 'HMI Designer',
    scada: 'SCADA & Trends',
    classroom: 'Virtual Classroom',
    assignments: 'Assignments & Tests',
    community: 'Community',
    library: 'Component Library',
    analytics: 'Lab Analytics',
    admin: 'Admin & Billing',
    docs: 'Engineering Docs',
    run: 'RUN',
    stop: 'STOP',
    pause: 'PAUSE',
    step: 'SINGLE STEP',
    save: 'Save Project',
    export: 'Export JSON',
    import: 'Import JSON',
    share: 'Share',
    scanTime: 'Scan Time',
    speed: 'Sim Speed',
    dialect: 'PLC Dialect',
    role: 'Active Role',
    status: 'System Status',
    activeSim: 'Active Simulation',
    components: 'Components',
    wires: 'Wires',
    rungs: 'Rungs',
    tags: 'I/O Tags',
    alarms: 'Active Alarms',
    onlineMonitoring: 'Online Power Flow',
    forceBit: 'Force Value',
    energized: 'Energized',
    digitalTwinSync: 'Digital Twin Synchronized',
    runAutoGrader: 'Run Automated Testbench',
    testsPassed: 'All Test Vectors Verified',
  },
  es: {
    appTitle: 'TwinLab Automatización',
    appSubtitle: 'Laboratorio de Gemelo Digital Industrial',
    dashboard: 'Panel de Control',
    electrical: 'Circuitos Eléctricos',
    ladder: 'Editor PLC Ladder',
    process3d: 'Gemelo Digital 3D',
    hmi: 'Diseñador HMI',
    scada: 'SCADA y Tendencias',
    classroom: 'Aula Virtual',
    assignments: 'Tareas y Evaluaciones',
    community: 'Comunidad',
    library: 'Biblioteca de Componentes',
    analytics: 'Analítica del Lab',
    admin: 'Admin y Suscripción',
    docs: 'Documentación Técnica',
    run: 'EJECUTAR',
    stop: 'DETENER',
    pause: 'PAUSA',
    step: 'PASO A PASO',
    save: 'Guardar Proyecto',
    export: 'Exportar JSON',
    import: 'Importar JSON',
    share: 'Compartir',
    scanTime: 'Tiempo de Ciclo',
    speed: 'Velocidad Sim',
    dialect: 'Dialecto PLC',
    role: 'Rol Actual',
    status: 'Estado del Sistema',
    activeSim: 'Simulación Activa',
    components: 'Componentes',
    wires: 'Cables',
    rungs: 'Renglones',
    tags: 'Variables E/S',
    alarms: 'Alarmas Activas',
    onlineMonitoring: 'Flujo de Energía en Línea',
    forceBit: 'Forzar Valor',
    energized: 'Energizado',
    digitalTwinSync: 'Gemelo Digital Sincronizado',
    runAutoGrader: 'Ejecutar Banco de Pruebas',
    testsPassed: 'Todos los Vectores Verificados',
  },
  ar: {
    appTitle: 'توين لاب للأتمتة الصناعية',
    appSubtitle: 'مختبر التوأم الرقمي للأتمتة والتحكم الصناعي',
    dashboard: 'لوحة التحكم',
    electrical: 'الدوائر الكهربائية',
    ladder: 'محرر منطق السلم PLC',
    process3d: 'التوأم الرقمي ثلاثي الأبعاد',
    hmi: 'مصمم شاشات HMI',
    scada: 'نظام سكادا والمؤشرات',
    classroom: 'الفصل الافتراضي',
    assignments: 'الواجبات والاختبارات',
    community: 'المجتمع والمشاريع',
    library: 'مكتبة المكونات الصناعية',
    analytics: 'تحليلات المختبر',
    admin: 'الإدارة والاشتراكات',
    docs: 'دليل الهندسة والتوثيق',
    run: 'تشغيل',
    stop: 'إيقاف',
    pause: 'إيقاف مؤقت',
    step: 'خطوة فردية',
    save: 'حفظ المشروع',
    export: 'تصدير JSON',
    import: 'استيراد JSON',
    share: 'مشاركة',
    scanTime: 'زمن المسح',
    speed: 'سرعة المحاكاة',
    dialect: 'نوع PLC',
    role: 'الدور النشط',
    status: 'حالة النظام',
    activeSim: 'المحاكاة النشطة',
    components: 'المكونات',
    wires: 'الأسلاك',
    rungs: 'الأسطر (Rungs)',
    tags: 'عناوين الدخل/الخرج',
    alarms: 'الإنذارات النشطة',
    onlineMonitoring: 'المراقبة الحية للطاقة',
    forceBit: 'فرض القيمة',
    energized: 'نشط / موصل',
    digitalTwinSync: 'التوأم الرقمي متزامن',
    runAutoGrader: 'تشغيل منصة الاختبار الآلية',
    testsPassed: 'تم اجتياز جميع حالات الاختبار',
  },
};
