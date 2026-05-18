import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">
          Suivi de l'ensemble du parc et des mouvements de clés.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Bienvenue sur Clavis</CardTitle>
          <CardDescription>
            La gestion des biens, clés, personnes et de l'historique des
            mouvements se fait depuis la barre de navigation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Les statistiques (clés en circulation, top receveurs, durée moyenne
            de détention) arrivent en phase 4.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
