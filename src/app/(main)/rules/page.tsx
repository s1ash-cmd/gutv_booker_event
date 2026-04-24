export default function RulesPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 md:pb-12">
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-md p-8 border border-border space-y-8">
        <h1 className="text-3xl font-bold text-card-foreground">
          Правила подачи заявок на мероприятия
        </h1>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-card-foreground">
            Кто может создавать заявки
          </h2>
          <p className="text-muted-foreground">
            Создание заявок доступно представителям организаций и
            администраторам. Члены GUtv в этой версии сервиса не подают
            event-заявки.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-card-foreground">
            Что указывать в заявке
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Кратко и понятно опишите причину или формат мероприятия.</li>
            <li>Укажите реальные даты и время начала и окончания.</li>
            <li>Добавьте комментарий, если есть важные детали для команды.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-card-foreground">
            Сроки подачи
          </h2>
          <p className="text-muted-foreground">
            Лучше отправлять заявку заранее. Если мероприятие создается меньше
            чем за 3 дня, система всё равно примет заявку, но пометит её
            предупреждением для администратора.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-card-foreground">
            Обработка заявки
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Новая заявка создается в статусе ожидания.</li>
            <li>Администратор может одобрить, отменить или завершить её.</li>
            <li>Ответ администратора отображается в карточке заявки.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-card-foreground">
            Корректность данных
          </h2>
          <p className="text-muted-foreground">
            Заявка автоматически привязывается к вашему аккаунту. Имя автора
            вручную не задается, поэтому используйте корректные данные профиля.
          </p>
        </section>
      </div>
    </main>
  );
}
