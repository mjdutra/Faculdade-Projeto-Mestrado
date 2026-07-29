"use client";

import { Card, CardHeader} from "@/components/ui/card";
import { User} from "lucide-react";
import { useAuth } from "@/firebase/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";


const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
    }
  };

   return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-500" />
                </div>

                <div>
                  <p className="font-semibold">{user?.displayName}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
            </CardHeader>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">
                    Experiências Submetidas
                  </p>
                </div>

                <div className="p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">
                    Ímanes Digitalizados
                  </p>
                </div>
              </div>

              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
              >
                Sair
              </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;