"use client";
import React, { useState, useEffect } from "react";
import { Building2, Plus, MapPin } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

export default function AdminOrganizationPage() {
  const [session, setSession] = useState<any>(null);
  const [orgData, setOrgData] = useState<any>({ departments: [], positions: [], locations: [] });
  const [activeTab, setActiveTab] = useState("departments");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");

  const loadOrg = async () => {
    try {
      const [meRes, orgRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/organization"),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (orgRes.ok) setOrgData(await orgRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadOrg(); }, []);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab === "departments" ? "department" : "position", data: { name: formName } }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormName("");
        loadOrg();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Struktur Organisasi & Lokasi</h1>
            <p className="text-xs text-slate-500 mt-0.5">Kelola departemen, jabatan (*positions*), dan lokasi kantor geofence.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center space-x-1.5">
            <Plus className="w-4 h-4" />
            <span>Tambah {activeTab === "departments" ? "Departemen" : "Jabatan"}</span>
          </Button>
        </div>

        <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-400">
          {[
            { id: "departments", label: `Departemen (${orgData.departments?.length || 0})` },
            { id: "positions", label: `Jabatan (${orgData.positions?.length || 0})` },
            { id: "locations", label: `Lokasi & Geofence (${orgData.locations?.length || 0})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-3 transition-colors ${activeTab === tab.id ? "text-primary border-b-2 border-primary font-extrabold" : "hover:text-slate-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "departments" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {orgData.departments?.map((dept: any) => (
              <div key={dept.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{dept.code}</span>
                <h3 className="font-bold text-slate-800 text-sm mt-1">{dept.name}</h3>
                <p className="text-[11px] text-slate-400">{dept.employees?.length || 0} Anggota</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "positions" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {orgData.positions?.map((pos: any) => (
              <div key={pos.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Level {pos.level}</span>
                <h3 className="font-bold text-slate-800 text-sm">{pos.name}</h3>
                <p className="text-[11px] text-slate-400">{pos.employees?.length || 0} Karyawan</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "locations" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {orgData.locations?.map((loc: any) => (
              <div key={loc.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5"><MapPin className="w-4 h-4 text-teal-600" /><span>{loc.name}</span></h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-mono font-bold text-xs border border-teal-200">Radius: {loc.radiusMeters}m</span>
                </div>
                <p className="text-xs text-slate-500">{loc.address}</p>
                <div className="p-2.5 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-600 flex justify-between">
                  <span>Lat: {loc.latitude}</span><span>Long: {loc.longitude}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Data">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Nama" required value={formName} onChange={(e) => setFormName(e.target.value)} />
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
