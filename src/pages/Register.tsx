import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/firebase/AuthContext";
import TopNav from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getAuthErrorMessage(code?: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Já existe uma conta com este email.";
    case "auth/invalid-email":
      return "Email inválido.";
    case "auth/weak-password":
      return "A password deve ter pelo menos 6 caracteres.";
    default:
      return "Não foi possível criar a conta. Tente novamente.";
  }
}

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As passwords não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(username, email, password);
      navigate("/");
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <TopNav />

      <div className="pt-28 md:pt-40 px-4 flex justify-center">
        <div className="w-full max-w-sm border border-black p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight mb-8 text-black">
            Criar Conta
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
            <Label htmlFor="username">Username</Label>
            <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nome de utilizador"
                required
                className="mt-1"
            />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-none uppercase text-xs font-bold tracking-widest bg-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? "A criar conta..." : "Criar Conta"}
            </Button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Já tem conta?{" "}
            <Link to="/login" className="text-black font-bold underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;