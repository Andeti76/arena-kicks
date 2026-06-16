export default function EventosPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-kicks-navy">Eventos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Sub-áreas e eventos com receita e despesa próprias
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-4xl mb-4">🏆</p>
        <p className="font-medium text-gray-600">Em desenvolvimento</p>
        <p className="text-sm mt-1 text-center max-w-sm">
          Esta tela permitirá criar campeonatos, torneios e eventos nas sub-áreas
          (Quadras de Areia, Society, Churrasqueira) com controle de receita e despesa por evento.
        </p>
      </div>
    </div>
  )
}
