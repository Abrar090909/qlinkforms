import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "./actions";

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next ?? ""} />
      <Button type="submit" variant="secondary" fullWidth>
        Continue with Google
      </Button>
    </form>
  );
}
