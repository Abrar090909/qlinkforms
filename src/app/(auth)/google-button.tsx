import { signInWithGoogle } from "./actions";

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next ?? ""} />
      <button type="submit" className="w-full rounded border px-4 py-2">
        Continue with Google
      </button>
    </form>
  );
}
