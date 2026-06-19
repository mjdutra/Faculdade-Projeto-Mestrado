"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Settings } from "lucide-react";


const Profile = () => {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Perfil</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-500" />
                </div>
                <div>
                  <CardTitle>John Doe</CardTitle>
                  <CardDescription>Membro desde 2026</CardDescription>
                </div> 
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">Experiências Submetidas</p>
                </div>
                <div className="p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-gray-600">Imans Digitalizados</p>
                </div>
              </div>
              {/* <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Settings className="w-4 h-4 mr-2" />
                Editar Perfil
              </Button> */}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Profile;