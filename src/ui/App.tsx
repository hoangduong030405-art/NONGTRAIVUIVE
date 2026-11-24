import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { Sprout } from 'lucide-react';
import { EventBus } from '../bridge/EventBus';
import { createGame } from '../game/main';
import { AlmanacModal } from './components/AlmanacModal';
import { ComboToast } from './components/ComboToast';
import { DailyQuestsModal } from './components/DailyQuestsModal';
import { IeltsQuizModal } from './components/IeltsQuizModal';
import { KitchenModal } from './components/KitchenModal';
import { MarketModal } from './components/MarketModal';
import { SeedDock } from './components/SeedDock';
import { TopHud } from './components/TopHud';
import { syncGameNow, useGameStore } from './store/useGameStore';

const SHOW_FPS = new URLSearchParams(window.location.search).has('fps');

function FpsMeter({ gameRef }: { gameRef: React.MutableRefObject<Phaser.Game | null> }) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFps(Math.round(gameRef.current?.loop.actualFps ?? 0)), 500);
    return () => window.clearInterval(id);
  }, [gameRef]);
  return (
    <div className="pointer-events-none fixed bottom-2 right-2 z-50 rounded-md bg-black/70 px-2 py-1 font-mono text-xs text-white">
      {fps} FPS
    </div>
  );
}

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const status = useGameStore((s) => s.status);
  const errorMessage = useGameStore((s) => s.errorMessage);
  const init = useGameStore((s) => s.init);

  // Load vocab + IndexedDB state
  useEffect(() => {
    void init();
  }, [init]);

  // Bridge: Phaser intents → store actions
  useEffect(() => {
    const onReady = () => syncGameNow();
    const onTap = ({ plotIndex }: { plotIndex: number }) => useGameStore.getState().handlePlotTap(plotIndex);
    const onHarvest = ({ plotIndex, autoHarvested }: { plotIndex: number; autoHarvested: boolean }) =>
      useGameStore.getState().harvestPlot(plotIndex, autoHarvested);

    const onAnimalInteract = ({ animalType }: { animalType: 'sheep' | 'chicken' | 'cow' | 'dog' }) =>
      useGameStore.getState().careAnimal(animalType);
    const onPondFish = () => useGameStore.getState().fishAtPond();

    const onOpenKitchen = () => useGameStore.getState().setKitchenOpen(true);

    EventBus.on('game:ready', onReady);
    EventBus.on('game:plot-tap', onTap);
    EventBus.on('game:harvest', onHarvest);
    EventBus.on('game:animal-interact', onAnimalInteract);
    EventBus.on('game:pond-fish', onPondFish);
    EventBus.on('game:open-kitchen', onOpenKitchen);
    return () => {
      EventBus.off('game:ready', onReady);
      EventBus.off('game:plot-tap', onTap);
      EventBus.off('game:harvest', onHarvest);
      EventBus.off('game:animal-interact', onAnimalInteract);
      EventBus.off('game:pond-fish', onPondFish);
      EventBus.off('game:open-kitchen', onOpenKitchen);
    };
  }, []);

  // Boot Phaser (Layer 1) once
  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined;
    gameRef.current = createGame(hostRef.current);
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="farm-field relative h-full w-full overflow-hidden">
      {/* Layer 1: WebGL farm canvas */}
      <div ref={hostRef} className="game-canvas-host absolute inset-0 z-0" aria-label="Farm field" />

      {/* Layer 2: responsive HUD (pointer-events pass through empty areas) */}
      {status === 'ready' && (
        <>
          <TopHud />
          <SeedDock />
          <IeltsQuizModal />
          <AlmanacModal />
          <MarketModal />
          <KitchenModal />
          <DailyQuestsModal />
        </>
      )}
      <ComboToast />

      {status === 'loading' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3">
          <div className="panel flex items-center gap-3 px-5 py-4">
            <Sprout className="animate-pulse text-accent" />
            <span className="font-bold">Preparing your farm…</span>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
          <div className="panel max-w-sm p-5 text-center">
            <p className="font-bold text-danger">Could not load LexiFarm</p>
            <p className="mt-1 text-sm text-muted">{errorMessage}</p>
            <button type="button" className="btn btn-primary mt-4 px-6" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      )}

      {SHOW_FPS && <FpsMeter gameRef={gameRef} />}
    </div>
  );
}
