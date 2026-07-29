# Projeto 

Plataforma web desenvolvida no âmbito da tese de Mestrado em Design Multimédia, intitulada "Multimedia Design and Interactive Narratives in Virtual Reality for Tourism Promotion".

O sistema permite a criadores configurar experiências imersivas em vídeo 360º associadas a objetos tangiveis, que os utilizadores podem depois explorar em desktop ou em dispositivos VR.

# Estrutura do Projeto
src/
├── components/
│   ├── magnet/         # MagnetPage, MagnetPrintScene, MagnetViewer, PrintMagnet , QRCode, VRExperience
├── ├── poi/            # Hotspot, HotspotTooltip, PointOfInterest
│   ├── video/          # Video360Viewer, VideoControls
│   └── TopNav
├── pages/               # Homepage, Submit, Magnet, Scan, Profile, Grid, Login, Register
├── types/               # magnet.ts (interface partilhada)
├── lib/                 # qrcode.ts, utils.ts, spherical.ts
├── services/            # cloudinary.ts, deletemagnet.ts
└── firebase/
    └── config.ts
    └── AuthContext.tsx


# instalar dependências
npm install --legacy-peer-deps

# variáveis de ambiente (.env)
VITE_APIKEY=...
VITE_AUTHDOMAIN=...
VITE_PROJECTID=...
VITE_STORAGEBUCKET=...
VITE_MESSAGINGSENDERID=...
VITE_APPID=...
VITE_MEASUREMENTID=...

VITE_CLOUDINARYCLOUDNAME=...
VITE_CLOUDINARYAPIKEY=...
VITE_CLOUDINARYAPISECRET=...

# correr em desenvolvimento
npm run dev

