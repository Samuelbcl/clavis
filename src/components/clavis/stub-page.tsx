import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StubPage({
  title,
  step,
  description,
}: {
  title: string;
  step: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>En construction</CardTitle>
          <CardDescription>
            Cette section sera implémentée à l'étape {step} de la roadmap.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
