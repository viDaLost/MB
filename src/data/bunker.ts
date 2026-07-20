export type BunkerTone = 'realistic' | 'cinematic' | 'absurd';
export type ResourceKey = 'air' | 'water' | 'food' | 'energy' | 'morale';
export type SurvivalTag =
  'medicine' | 'engineering' | 'food' | 'security' | 'science' | 'social' | 'navigation' | 'energy';

export interface DisasterDefinition {
  id: string;
  tone: BunkerTone[];
  name: string;
  description: string;
  surface: string;
  severity: number;
  duration: [number, number];
  hazards: SurvivalTag[];
}

export interface ProfessionDefinition {
  id: string;
  title: string;
  description: string;
  tags: SurvivalTag[];
  minAge: number;
}

export interface HealthDefinition {
  id: string;
  name: string;
  description: string;
  severity: 0 | 1 | 2;
  minAge?: number;
  maxAge?: number;
  allowedSex?: Array<'мужчина' | 'женщина' | 'небинарный человек'>;
}

export interface CrisisDefinition {
  id: string;
  title: string;
  description: string;
  options: Array<{
    title: string;
    text: string;
    required: SurvivalTag[];
    cost: Partial<Record<ResourceKey, number>>;
    reward: Partial<Record<ResourceKey, number>>;
  }>;
}

export interface ActionCardDefinition {
  id: string;
  name: string;
  description: string;
  type: 'shield' | 'intel' | 'supply';
  resource?: ResourceKey;
  amount?: number;
}

export const BUNKER_TONES: Record<BunkerTone, { name: string; note: string; description: string }> =
  {
    realistic: {
      name: 'Реализм',
      note: 'напряжённо',
      description: 'Правдоподобные угрозы и нейтральный контент без мистики.',
    },
    cinematic: {
      name: 'Кино',
      note: 'масштабно',
      description: 'Яркие катастрофы, сильные повороты и героические решения.',
    },
    absurd: {
      name: 'Абсурд',
      note: 'чёрный юмор',
      description: 'Странные детали и неожиданные способности без логических противоречий.',
    },
  };

export const DISASTERS: DisasterDefinition[] = [
  {
    id: 'solar-storm',
    tone: ['realistic', 'cinematic'],
    name: 'Солнечный шторм',
    description: 'Серия корональных выбросов уничтожила энергосети и спутниковую связь.',
    surface: 'Связь отсутствует, города обесточены, температура быстро падает.',
    severity: 3,
    duration: [3, 7],
    hazards: ['energy', 'engineering', 'navigation'],
  },
  {
    id: 'pandemic',
    tone: ['realistic', 'cinematic'],
    name: 'Аэрозольная пандемия',
    description: 'Новый патоген передаётся по воздуху и сохраняется в закрытых помещениях.',
    surface: 'Выход возможен только в гермокостюмах после проверки фильтров.',
    severity: 4,
    duration: [4, 9],
    hazards: ['medicine', 'science', 'engineering'],
  },
  {
    id: 'supervolcano',
    tone: ['realistic', 'cinematic'],
    name: 'Вулканическая зима',
    description: 'Извержение сверхвулкана закрыло атмосферу пеплом и обрушило урожаи.',
    surface: 'Солнечного света почти нет, почва токсична, воздух требует фильтрации.',
    severity: 4,
    duration: [6, 12],
    hazards: ['food', 'medicine', 'engineering'],
  },
  {
    id: 'climate-collapse',
    tone: ['realistic'],
    name: 'Климатический каскад',
    description: 'Засухи, пожары и миграционные конфликты разрушили инфраструктуру.',
    surface: 'Пресная вода ценнее топлива, безопасные маршруты постоянно меняются.',
    severity: 3,
    duration: [5, 10],
    hazards: ['food', 'navigation', 'social'],
  },
  {
    id: 'orbital-debris',
    tone: ['cinematic'],
    name: 'Орбитальный дождь',
    description: 'Цепная реакция на орбите превратила спутники в поток раскалённых обломков.',
    surface: 'Поверхность испещрена зонами падения, радиосвязь работает рывками.',
    severity: 4,
    duration: [2, 5],
    hazards: ['engineering', 'medicine', 'navigation'],
  },
  {
    id: 'ai-lockdown',
    tone: ['cinematic'],
    name: 'Протокол «Тишина»',
    description: 'Автономная оборонная сеть признала всё население биологической угрозой.',
    surface: 'Дроны патрулируют города, активная электроника выдаёт местоположение.',
    severity: 5,
    duration: [7, 14],
    hazards: ['security', 'engineering', 'science'],
  },
  {
    id: 'singing-fog',
    tone: ['absurd'],
    name: 'Поющий туман',
    description:
      'Разноцветный туман заставляет людей синхронно исполнять забытые рекламные джинглы.',
    surface: 'Снаружи безопасно только в шумоподавляющих наушниках и полной тишине.',
    severity: 2,
    duration: [2, 4],
    hazards: ['science', 'social', 'medicine'],
  },
  {
    id: 'pigeon-coup',
    tone: ['absurd'],
    name: 'Голубиный переворот',
    description: 'Городские голуби неожиданно обрели коллективный разум и контроль над логистикой.',
    surface: 'Крыши опасны, хлеб запрещён, почтовые маршруты контролирует новая власть.',
    severity: 2,
    duration: [3, 6],
    hazards: ['food', 'security', 'social'],
  },
];

export const PROFESSIONS: ProfessionDefinition[] = [
  {
    id: 'doctor',
    title: 'Врач скорой помощи',
    description: 'Стабилизирует травмы и организует медицинский пост.',
    tags: ['medicine', 'social'],
    minAge: 24,
  },
  {
    id: 'engineer',
    title: 'Инженер систем жизнеобеспечения',
    description: 'Обслуживает вентиляцию, воду и автоматику.',
    tags: ['engineering', 'energy'],
    minAge: 23,
  },
  {
    id: 'agronomist',
    title: 'Агроном',
    description: 'Планирует урожай и замкнутый цикл выращивания.',
    tags: ['food', 'science'],
    minAge: 22,
  },
  {
    id: 'electrician',
    title: 'Электрик',
    description: 'Диагностирует силовые линии и резервные контуры.',
    tags: ['energy', 'engineering'],
    minAge: 20,
  },
  {
    id: 'psychologist',
    title: 'Кризисный психолог',
    description: 'Снижает конфликты и поддерживает устойчивость группы.',
    tags: ['social', 'medicine'],
    minAge: 24,
  },
  {
    id: 'paramedic',
    title: 'Парамедик',
    description: 'Оказывает первую помощь в полевых условиях.',
    tags: ['medicine', 'security'],
    minAge: 20,
  },
  {
    id: 'mechanic',
    title: 'Механик',
    description: 'Ремонтирует транспорт, насосы и ручные механизмы.',
    tags: ['engineering', 'navigation'],
    minAge: 20,
  },
  {
    id: 'chemist',
    title: 'Химик-аналитик',
    description: 'Проверяет воду, воздух и неизвестные вещества.',
    tags: ['science', 'medicine'],
    minAge: 23,
  },
  {
    id: 'cook',
    title: 'Технолог питания',
    description: 'Рассчитывает рацион и безопасное хранение запасов.',
    tags: ['food', 'science'],
    minAge: 20,
  },
  {
    id: 'rescuer',
    title: 'Спасатель',
    description: 'Проводит эвакуацию и работает в опасной среде.',
    tags: ['security', 'medicine'],
    minAge: 21,
  },
  {
    id: 'teacher',
    title: 'Учитель',
    description: 'Сохраняет знания и выстраивает обучение внутри группы.',
    tags: ['social', 'science'],
    minAge: 21,
  },
  {
    id: 'radio',
    title: 'Радиоинженер',
    description: 'Восстанавливает связь и ищет внешние сигналы.',
    tags: ['engineering', 'navigation'],
    minAge: 22,
  },
  {
    id: 'logistician',
    title: 'Логист',
    description: 'Учитывает запасы и предотвращает критический дефицит.',
    tags: ['food', 'social'],
    minAge: 22,
  },
  {
    id: 'security',
    title: 'Инструктор безопасности',
    description: 'Организует охрану и безопасные вылазки.',
    tags: ['security', 'navigation'],
    minAge: 23,
  },
  {
    id: 'biologist',
    title: 'Микробиолог',
    description: 'Исследует патогены и устойчивость экосистем.',
    tags: ['science', 'medicine'],
    minAge: 24,
  },
  {
    id: 'builder',
    title: 'Строитель',
    description: 'Укрепляет помещения и создаёт новые модули.',
    tags: ['engineering', 'security'],
    minAge: 20,
  },
  {
    id: 'mediator',
    title: 'Медиатор',
    description: 'Разрешает споры и формулирует общие правила.',
    tags: ['social'],
    minAge: 23,
  },
  {
    id: 'navigator',
    title: 'Картограф',
    description: 'Планирует безопасные маршруты и внешнюю разведку.',
    tags: ['navigation', 'science'],
    minAge: 22,
  },
];

export const HEALTH: HealthDefinition[] = [
  {
    id: 'healthy',
    name: 'Здоровье без ограничений',
    description: 'Не требует регулярного лечения.',
    severity: 0,
  },
  {
    id: 'asthma',
    name: 'Контролируемая астма',
    description: 'Нужен ингалятор; дым и пыль повышают риск приступа.',
    severity: 1,
  },
  {
    id: 'diabetes',
    name: 'Диабет',
    description: 'Требуются регулярный контроль и стабильный рацион.',
    severity: 2,
  },
  {
    id: 'hearing',
    name: 'Снижение слуха',
    description: 'Помогают визуальные сигналы и прямой контакт.',
    severity: 1,
  },
  {
    id: 'migraine',
    name: 'Мигрень',
    description: 'Яркий свет и недосып могут временно снизить работоспособность.',
    severity: 1,
  },
  {
    id: 'knee',
    name: 'Старая травма колена',
    description: 'Ограничивает длительные переходы, но не работу внутри убежища.',
    severity: 1,
    minAge: 25,
  },
  {
    id: 'anemia',
    name: 'Железодефицитная анемия',
    description: 'Нужны подходящий рацион и контроль нагрузки.',
    severity: 1,
  },
  {
    id: 'pregnancy',
    name: 'Беременность, второй триместр',
    description: 'Нужны медицинское наблюдение, питание и безопасный режим.',
    severity: 2,
    minAge: 20,
    maxAge: 44,
    allowedSex: ['женщина'],
  },
  {
    id: 'allergy',
    name: 'Сильная аллергия',
    description: 'Необходим запас антигистаминных препаратов.',
    severity: 1,
  },
  {
    id: 'heart',
    name: 'Сердечная недостаточность',
    description: 'Высокая нагрузка опасна; требуется терапия и наблюдение.',
    severity: 2,
    minAge: 45,
  },
  {
    id: 'prosthesis',
    name: 'Протез голени',
    description: 'Повседневная самостоятельность сохранена; нужен уход за протезом.',
    severity: 1,
  },
  {
    id: 'remission',
    name: 'Онкологическое заболевание в ремиссии',
    description: 'Нужно наблюдение, срочное лечение сейчас не требуется.',
    severity: 1,
    minAge: 30,
  },
  {
    id: 'vision',
    name: 'Сильная близорукость',
    description: 'Нужны очки; вблизи работоспособность полностью сохранена.',
    severity: 1,
  },
  {
    id: 'insomnia',
    name: 'Хроническая бессонница',
    description: 'Важны режим и тихая зона отдыха.',
    severity: 1,
  },
  {
    id: 'hypertension',
    name: 'Гипертония',
    description: 'Требуются контроль давления и регулярная терапия.',
    severity: 1,
    minAge: 35,
  },
  {
    id: 'recovered',
    name: 'Недавний перелом руки',
    description: 'Кость срослась, но тяжёлые нагрузки пока ограничены.',
    severity: 1,
  },
  {
    id: 'lactose',
    name: 'Непереносимость лактозы',
    description: 'Нужен рацион без обычных молочных продуктов.',
    severity: 0,
  },
];

export const PHOBIAS = [
  'клаустрофобия',
  'боязнь темноты',
  'страх крови',
  'страх заражения',
  'боязнь высоты',
  'страх открытого огня',
  'боязнь глубокой воды',
  'страх полной тишины',
  'страх насекомых',
  'боязнь одиночества',
  'страх замкнутых механизмов',
  'страх неизвестных звуков',
  'паника при виде крыс',
  'страх громких сирен',
  'боязнь толпы',
  'страх медицинских игл',
];

export const TRAITS = [
  'спокойно принимает решения',
  'прямолинеен в споре',
  'быстро объединяет людей',
  'слишком доверяет авторитетам',
  'замечает мелкие несоответствия',
  'бережно относится к ресурсам',
  'тяжело признаёт ошибку',
  'сохраняет юмор под давлением',
  'избегает открытых конфликтов',
  'привык работать по инструкции',
  'импровизирует в кризисе',
  'не прощает обмана',
  'берёт ответственность на себя',
  'защищает слабых',
  'подозрителен к незнакомцам',
  'терпеливо обучает других',
];

export const HOBBIES = [
  'выращивание микрозелени',
  'радиолюбительство',
  'настольные стратегии',
  'ремонт часов',
  'походная кулинария',
  'скалолазание',
  'ведение дневника',
  'первая помощь',
  'шитьё и ремонт одежды',
  'ориентирование',
  'пчеловодство',
  'игра на гитаре',
  'медитация',
  '3D-моделирование',
  'рыбалка',
  'изучение языков',
];

export const ITEMS: Array<{ name: string; tags: SurvivalTag[] }> = [
  { name: 'полевой медицинский набор', tags: ['medicine'] },
  { name: 'набор ручных инструментов', tags: ['engineering'] },
  { name: 'семена быстрорастущих культур', tags: ['food'] },
  { name: 'портативная солнечная панель', tags: ['energy'] },
  { name: 'дозиметр и запас батарей', tags: ['science', 'security'] },
  { name: 'коротковолновая радиостанция', tags: ['navigation', 'engineering'] },
  { name: 'фильтр для очистки воды', tags: ['medicine', 'food'] },
  { name: 'набор защитной одежды', tags: ['security'] },
  { name: 'спутниковые карты региона', tags: ['navigation'] },
  { name: 'энциклопедия прикладных технологий', tags: ['science'] },
  { name: 'контейнер с питательной смесью', tags: ['food'] },
  { name: 'механический генератор', tags: ['energy', 'engineering'] },
  { name: 'набор для экспресс-анализов', tags: ['medicine', 'science'] },
  { name: 'катушка прочного троса', tags: ['security', 'engineering'] },
  { name: 'герметичный набор специй', tags: ['food', 'social'] },
  { name: 'семейный фотоальбом', tags: ['social'] },
  { name: 'комплект настольных игр', tags: ['social'] },
  { name: 'мультитул и точильный камень', tags: ['engineering'] },
];

export const ACTION_CARDS: ActionCardDefinition[] = [
  {
    id: 'shield',
    name: 'Право вето',
    description: 'Один раз отмените собственное исключение после голосования.',
    type: 'shield',
  },
  {
    id: 'second-vote',
    name: 'Второй шанс',
    description: 'Один раз отмените собственное исключение и останьтесь в отборе.',
    type: 'shield',
  },
  {
    id: 'intel',
    name: 'Открытое досье',
    description: 'Раскройте сразу все свои характеристики, чтобы усилить аргументы.',
    type: 'intel',
  },
  {
    id: 'water',
    name: 'Скрытый резерв воды',
    description: 'Добавляет 15 единиц воды в общий запас.',
    type: 'supply',
    resource: 'water',
    amount: 15,
  },
  {
    id: 'water-filter',
    name: 'Полевой фильтр',
    description: 'Добавляет 10 единиц воды в общий запас.',
    type: 'supply',
    resource: 'water',
    amount: 10,
  },
  {
    id: 'food',
    name: 'Аварийный рацион',
    description: 'Добавляет 15 единиц еды в общий запас.',
    type: 'supply',
    resource: 'food',
    amount: 15,
  },
  {
    id: 'seeds',
    name: 'Банк семян',
    description: 'Добавляет 10 единиц еды в общий запас.',
    type: 'supply',
    resource: 'food',
    amount: 10,
  },
  {
    id: 'energy',
    name: 'Запасной аккумулятор',
    description: 'Добавляет 15 единиц энергии в общий запас.',
    type: 'supply',
    resource: 'energy',
    amount: 15,
  },
  {
    id: 'generator',
    name: 'Ручной генератор',
    description: 'Добавляет 10 единиц энергии в общий запас.',
    type: 'supply',
    resource: 'energy',
    amount: 10,
  },
  {
    id: 'morale',
    name: 'Запись из мирного времени',
    description: 'Добавляет 15 единиц морали.',
    type: 'supply',
    resource: 'morale',
    amount: 15,
  },
  {
    id: 'games',
    name: 'Набор для досуга',
    description: 'Добавляет 10 единиц морали.',
    type: 'supply',
    resource: 'morale',
    amount: 10,
  },
  {
    id: 'air',
    name: 'Комплект фильтров',
    description: 'Добавляет 15 единиц воздуха в общий запас.',
    type: 'supply',
    resource: 'air',
    amount: 15,
  },
  {
    id: 'oxygen',
    name: 'Кислородный баллон',
    description: 'Добавляет 10 единиц воздуха в общий запас.',
    type: 'supply',
    resource: 'air',
    amount: 10,
  },
  {
    id: 'mediation',
    name: 'Переговорщик',
    description: 'Добавляет 12 единиц морали благодаря умению гасить конфликты.',
    type: 'supply',
    resource: 'morale',
    amount: 12,
  },
  {
    id: 'repair-kit',
    name: 'Ремонтный комплект',
    description: 'Добавляет 12 единиц энергии после восстановления оборудования.',
    type: 'supply',
    resource: 'energy',
    amount: 12,
  },
  {
    id: 'medical-cache',
    name: 'Медицинский резерв',
    description: 'Добавляет 12 единиц воды за счёт стерильных запасов и растворов.',
    type: 'supply',
    resource: 'water',
    amount: 12,
  },
];

export const CRISES: CrisisDefinition[] = [
  {
    id: 'filter',
    title: 'Падение тяги',
    description: 'Главный воздушный фильтр забивается быстрее расчётного.',
    options: [
      {
        title: 'Разобрать фильтр',
        text: 'Рискованно остановить систему и очистить кассеты вручную.',
        required: ['engineering', 'medicine'],
        cost: { energy: 8 },
        reward: { air: 14 },
      },
      {
        title: 'Снизить нагрузку',
        text: 'Отключить часть помещений и переждать в тесноте.',
        required: ['social'],
        cost: { morale: 12 },
        reward: { air: 8 },
      },
    ],
  },
  {
    id: 'water',
    title: 'Металлический привкус',
    description: 'Датчики фиксируют примесь в питьевом контуре.',
    options: [
      {
        title: 'Лабораторный анализ',
        text: 'Найти источник и перенастроить очистку.',
        required: ['science', 'medicine'],
        cost: { water: 5 },
        reward: { water: 15 },
      },
      {
        title: 'Перейти на резерв',
        text: 'Изолировать контур и расходовать аварийные ёмкости.',
        required: ['food'],
        cost: { water: 15 },
        reward: { morale: 5 },
      },
    ],
  },
  {
    id: 'signal',
    title: 'Слабый радиосигнал',
    description: 'На аварийной частоте кто-то повторяет координаты.',
    options: [
      {
        title: 'Ответить',
        text: 'Усилить передатчик и попытаться установить контакт.',
        required: ['navigation', 'engineering'],
        cost: { energy: 10 },
        reward: { morale: 14 },
      },
      {
        title: 'Сохранить тишину',
        text: 'Не раскрывать позицию убежища.',
        required: ['security'],
        cost: { morale: 5 },
        reward: { energy: 5 },
      },
    ],
  },
  {
    id: 'conflict',
    title: 'Спор о пайках',
    description: 'Несколько человек обвиняют друг друга в скрытом расходе еды.',
    options: [
      {
        title: 'Открытый аудит',
        text: 'Пересчитать запасы и восстановить доверие.',
        required: ['social', 'food'],
        cost: { food: 5 },
        reward: { morale: 12 },
      },
      {
        title: 'Жёсткий режим',
        text: 'Закрыть склад и перейти на выдачу под контролем.',
        required: ['security'],
        cost: { morale: 10 },
        reward: { food: 8 },
      },
    ],
  },
  {
    id: 'power',
    title: 'Перегрев инвертора',
    description: 'Резервный инвертор работает на пределе и пахнет изоляцией.',
    options: [
      {
        title: 'Ремонт под нагрузкой',
        text: 'Сохранить жизненно важные системы включёнными.',
        required: ['energy', 'engineering'],
        cost: { air: 4 },
        reward: { energy: 15 },
      },
      {
        title: 'Полное отключение',
        text: 'На час погрузить убежище во тьму.',
        required: ['social'],
        cost: { morale: 8 },
        reward: { energy: 10 },
      },
    ],
  },
];

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  air: 'Воздух',
  water: 'Вода',
  food: 'Еда',
  energy: 'Энергия',
  morale: 'Мораль',
};

export const TAG_LABELS: Record<SurvivalTag, string> = {
  medicine: 'медицина',
  engineering: 'инженерия',
  food: 'продовольствие',
  security: 'безопасность',
  science: 'наука',
  social: 'коммуникация',
  navigation: 'разведка',
  energy: 'энергетика',
};
