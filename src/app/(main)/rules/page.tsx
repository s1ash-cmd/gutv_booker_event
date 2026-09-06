import { ArrowRight, Clock3, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const deadlines = [
  {
    time: "14 дней",
    detail: "до мероприятия — заявка на освещение",
    rule: "3.1",
  },
  { time: "21 день", detail: "до сдачи готового видеоконтента", rule: "3.2" },
  {
    time: "2 календарных месяца",
    detail: "до выезда — заявка на команду ГУТВ",
    rule: "4.3",
  },
  {
    time: "1 месяц",
    detail: "до выезда — перечень необходимого контента",
    rule: "4.4",
  },
  {
    time: "3 рабочих дня",
    detail: "рассмотрение заявки с момента поступления",
    rule: "2.1",
  },
];

const sections = [
  {
    number: "1",
    title: "Общие положения",
    rules: [
      {
        number: "1.1",
        text: "Губкинское телевидение (далее - Студия, ГУТВ) представляет собой творческую студию Дворца культуры «Губкинец» федерального государственного автономного образовательного учреждения высшего образования «Российский государственный университет нефти и газа (национальный исследовательский университет) имени И.М. Губкина» (далее - Университет), созданное в целях осуществления видео- и (или) фотоосвещение мероприятий и создания видеоконтента (далее совместно - создание видеоматериалов).",
        items: [],
      },
      {
        number: "1.2",
        text: "Настоящие Правила работы ГУТВ с председателями (представителями) Советов Обучающихся Факультетов и председателями (представителями, руководителями) Студенческих объединений (организаций) (далее - Правила) регламентируют порядок взаимодействия Студии с указанными лицами при осуществлении видео- и (или) фотоосвещение мероприятий и создании видеоконтента.",
        items: [],
      },
      {
        number: "1.3",
        text: "Действие настоящих Правил распространяется исключительно на председателей (представителей) Советов Обучающихся Факультетов и председателей (представителей, руководителей) Студенческих объединений (организаций) (далее совместно - Представители СО Факультетов и Студенческих организаций).",
        items: [],
      },
      {
        number: "1.4",
        text: "Съёмка мероприятий и создание видеоконтента осуществляются Студией в горизонтальном формате.",
        items: [],
      },
    ],
  },
  {
    number: "2",
    title: "Порядок взаимодействия со студией",
    rules: [
      {
        number: "2.1",
        text: "Взаимодействие с ГУТВ осуществляется посредством подачи заявок через официальный сайт. Правом подачи заявок обладают студенты, состоящие в органах студенческого самоуправления Университета. Срок рассмотрения заявки Студией составляет 3 (три) рабочих дня с момента её поступления.",
        items: [],
      },
      {
        number: "2.2",
        text: "Видео-освещение и (или) фото-освещение мероприятий и создание видеоконтента осуществляются Студией самостоятельно либо с привлечением иных участников Студии.",
        items: [],
      },
      {
        number: "2.3",
        text: "В случае несоблюдения Представителями СО Факультетов и Студенческих организаций порядка согласования и осуществления видео- и (или) фотоосвещение мероприятий и (или) создания видеоконтента, а также в случае несогласия Студии с предложенными условиями видео-освещения мероприятия и (или) создания видеоконтента, ГУТВ вправе отказать в видео-освещении мероприятия и (или) создании видеоконтента без объяснения причин.",
        items: [],
      },
      {
        number: "2.4",
        text: "В случае технической неисправности официального сайта приём заявок осуществляется через gubkin-forms.",
        items: [],
      },
      {
        number: "2.5",
        text: "В случае возникновения разногласий между Сторонами по вопросам, связанным с применением настоящих Правил, между директором Студии и председателем (представителем) соответствующей организации (факультета) организуется очная встреча в целях урегулирования разногласий.",
        items: [],
      },
    ],
  },
  {
    number: "3",
    title:
      "Порядок согласования и осуществления видео-освещения мероприятий и создания видеоконтента",
    rules: [
      {
        number: "3.1",
        text: "Представители СО Факультетов и Студенческих организаций обязаны уведомить ГУТВ о необходимости видео-освещения мероприятия не позднее, чем за 14 (четырнадцать) дней до даты проведения соответствующего мероприятия.",
        items: [],
      },
      {
        number: "3.2",
        text: "Представители СО Факультетов и Студенческих организаций обязаны уведомить ГУТВ о необходимости создания видеоконтента не позднее, чем за 21 (двадцать один) день до установленного срока сдачи готового видеоматериала.",
        items: [],
      },
      {
        number: "3.3",
        text: "Заявка должна содержать следующие сведения:",
        items: [
          "а) обоснование необходимости видео-освещения мероприятия и (или) создания видеоконтента;",
          "б) дату, время и место проведения съёмок;",
          "в) план проведения мероприятия и (или) сценарий видеоролика;",
          "г) количество лиц, задействованных в видеосъёмке.",
        ],
      },
      {
        number: "3.4",
        text: "Сроки подготовки готового видео- и (или) фотоматериалов определяет Директор ГУТВ, исходя из текущих задач и загруженности Студии на период времени осуществления выполнения заявки.",
        items: [],
      },
    ],
  },
  {
    number: "4",
    title: "Выездные учёбы",
    rules: [
      {
        number: "4.1",
        text: "Студия может предоставить для работы на выездных учёбах следующих организаторов от ГУТВ: специалисты видео-освещения (видеоинженер, оператор, монтажёр), специалист по звуку, фотограф, специалист по свету.",
        items: [],
      },
      {
        number: "4.2",
        text: "В заявке, направляемой через сайт, необходимо указать запрашиваемые позиции и их количество. Состав представителей ГУТВ, направляемых на выездную учёбу, определяется директором Студии.",
        items: [],
      },
      {
        number: "4.3",
        text: "ГУТВ уведомляется о необходимости предоставления представителей Студии для участия в выездной учёбе не позднее, чем за 2 (два) месяца до даты проведения выезда.",
        items: [],
      },
      {
        number: "4.4",
        text: "Для осуществления работы ГУТВ на выездной учёбе организатор обязан предоставить перечень необходимого контента не позднее, чем за 1 (один) месяц до даты проведения выездной учёбы.",
        items: [],
      },
      {
        number: "4.5",
        text: "Прибытие представителей Губкинского телевидения на базу проведения выездной учёбы осуществляется не позднее, чем за 2 (два) дня до её начала в целях осуществления технической подготовки оборудования и съёмочных локаций.",
        items: [],
      },
      {
        number: "4.6",
        text: "В случае несогласия с условиями проведения выездной учёбы ГУТВ вправе отказаться от предоставления представителей Студии для участия в соответствующей выездной учёбе.",
        items: [],
      },
      {
        number: "4.7",
        text: "В заявке необходимо предоставить описание идеи контента и (или) концертной программы мероприятия, с указанием конкретного формата реализации (трансляция на кулисы/индивидуальная фотосъёмка каждого участника/отдельный видеоролик для выездной учёбы и т.п.);",
        items: [],
      },
    ],
  },
];

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 md:py-12 md:pb-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Губкинское телевидение
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Правила работы со студией
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            Для председателей и представителей советов обучающихся факультетов,
            председателей, представителей и руководителей студенческих
            объединений и организаций.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/">
              Создать заявку{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </header>

        <section
          aria-labelledby="deadlines-title"
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6"
        >
          <h2
            id="deadlines-title"
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
          >
            <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
            Сроки подачи и рассмотрения
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deadlines.map((deadline) => (
              <div
                key={deadline.rule}
                className="rounded-lg border border-border bg-card p-4"
              >
                <dt className="text-xl font-bold text-primary">
                  {deadline.time}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {deadline.detail}
                  <a
                    href={`#rule-${deadline.rule}`}
                    className="ml-1 whitespace-nowrap text-primary underline underline-offset-4"
                  >
                    п. {deadline.rule}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Уведомите студию не позднее указанных сроков. Сроки подготовки
            готовых материалов и состав выездной команды определяет директор
            ГУТВ.
          </p>
        </section>

        <nav aria-label="Разделы правил" className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <a
              key={section.number}
              href={`#section-${section.number}`}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {section.number}.{" "}
              {section.number === "3" ? "Съёмка и видеоконтент" : section.title}
            </a>
          ))}
        </nav>

        {sections.map((section) => (
          <section
            key={section.number}
            id={`section-${section.number}`}
            aria-labelledby={`title-${section.number}`}
            className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card"
          >
            <h2
              id={`title-${section.number}`}
              className="border-b border-border bg-secondary/30 px-4 py-5 text-lg font-semibold sm:px-6 sm:text-xl"
            >
              {section.number}. {section.title}
            </h2>
            <ol className="divide-y divide-border px-4 sm:px-6">
              {section.rules.map((rule) => (
                <li
                  key={rule.number}
                  id={`rule-${rule.number}`}
                  className="scroll-mt-24 py-5 sm:flex sm:gap-4"
                >
                  <span className="mb-2 block shrink-0 text-sm font-semibold text-primary sm:mb-0 sm:w-9 sm:pt-0.5">
                    {rule.number}.
                  </span>
                  <div className="min-w-0 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
                    <p>{rule.text}</p>
                    {rule.items.length > 0 && (
                      <ul className="space-y-2 rounded-lg bg-secondary/30 p-4">
                        {rule.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Подготовьте сведения о съёмке, план мероприятия или сценарий и
            отправьте заявку.
          </p>
          <Button asChild className="shrink-0">
            <Link href="/">
              Создать заявку{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
