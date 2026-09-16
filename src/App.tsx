import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CrotalList } from './components/CrotalList';
import { AnimalDetailModal } from './components/AnimalDetailModal';
import { AnimalFormModal } from './components/AnimalFormModal';
import { ProductionModule } from './components/ProductionModule';
import { InvoiceModule } from './components/InvoiceModule';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SecurityPrivacyModal } from './components/SecurityPrivacyModal';
import { FarmSettingsModal } from './components/FarmSettingsModal';
import { BottomNav } from './components/BottomNav';
import { LocalDbService } from './services/db';
import { Animal, FarmConfig, InvoiceDoc, SaleInvoiceTemplate } from './types';

export const App: React.FC = () => {
  // Global State
  const [farmConfig, setFarmConfig] = useState<FarmConfig>(() => LocalDbService.getFarmConfig());
  const [animals, setAnimals] = useState<Animal[]>(() => LocalDbService.getAnimals());
  const [invoices, setInvoices] = useState<InvoiceDoc[]>(() => LocalDbService.getInvoices());
  const [saleTemplate, setSaleTemplate] = useState<SaleInvoiceTemplate>(() => LocalDbService.getSaleTemplate());

  // Navigation State
  const [activeTab, setActiveTab] = useState<'ganado' | 'produccion' | 'facturas' | 'analytics'>('ganado');

  // Modals State
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync Farm Config updates
  const handleUpdateFarmConfig = (newConfig: FarmConfig) => {
    setFarmConfig(newConfig);
    LocalDbService.saveFarmConfig(newConfig);
  };

  // Animal Handlers
  const handleSaveAnimal = (animalData: Omit<Animal, 'id'> | Animal) => {
    if ('id' in animalData && animalData.id) {
      LocalDbService.updateAnimal(animalData as Animal);
      setAnimals(LocalDbService.getAnimals());
    } else {
      LocalDbService.addAnimal(animalData as Omit<Animal, 'id'>);
      setAnimals(LocalDbService.getAnimals());
    }
  };

  const handleDeleteAnimal = (id: string) => {
    LocalDbService.deleteAnimal(id);
    setAnimals(LocalDbService.getAnimals());
  };

  const handleUpdateAnimalDirect = (updatedAnimal: Animal) => {
    LocalDbService.updateAnimal(updatedAnimal);
    setAnimals(LocalDbService.getAnimals());
  };

  // Invoice Handlers
  const handleAddInvoice = (newInvoice: Omit<InvoiceDoc, 'id'>) => {
    LocalDbService.addInvoice(newInvoice);
    setInvoices(LocalDbService.getInvoices());
  };

  const handleDeleteInvoice = (id: string) => {
    LocalDbService.deleteInvoice(id);
    setInvoices(LocalDbService.getInvoices());
  };

  const handleSaveSaleTemplate = (template: SaleInvoiceTemplate) => {
    setSaleTemplate(template);
    LocalDbService.saveSaleTemplate(template);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        farmConfig={farmConfig}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSecurity={() => setIsSecurityOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 mb-20">
        {activeTab === 'ganado' && (
          <CrotalList
            animals={animals}
            onSelectAnimal={(animal) => setSelectedAnimal(animal)}
            onAddAnimal={() => {
              setEditingAnimal(null);
              setIsFormOpen(true);
            }}
          />
        )}

        {activeTab === 'produccion' && (
          <ProductionModule
            farmConfig={farmConfig}
            animals={animals}
            onUpdateFarmConfig={handleUpdateFarmConfig}
            onUpdateAnimal={handleUpdateAnimalDirect}
          />
        )}

        {activeTab === 'facturas' && (
          <InvoiceModule
            invoices={invoices}
            onAddInvoice={handleAddInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            saleTemplate={saleTemplate}
            onSaveSaleTemplate={handleSaveSaleTemplate}
            animals={animals}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            animals={animals}
            invoices={invoices}
            farmConfig={farmConfig}
          />
        )}
      </main>

      {/* Bottom Mobile Tab Bar */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modals */}
      <AnimalDetailModal
        animal={selectedAnimal}
        onClose={() => setSelectedAnimal(null)}
        onEdit={(animal) => {
          setEditingAnimal(animal);
          setIsFormOpen(true);
        }}
        onDelete={handleDeleteAnimal}
        allAnimals={animals}
      />

      <AnimalFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAnimal(null);
        }}
        onSave={handleSaveAnimal}
        initialAnimal={editingAnimal}
        existingAnimals={animals}
      />

      <SecurityPrivacyModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      <FarmSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={farmConfig}
        onSave={handleUpdateFarmConfig}
      />
    </div>
  );
};
export default App;
