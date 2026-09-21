"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import {
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CheckSquare,
  Square,
  Sparkles,
  Calendar,
  Building2,
  FileText,
  Laptop,
} from "lucide-react";

export default function AdminRecruitmentOnboardingPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [groupedEmployees, setGroupedEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [authRes, onbRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/recruitment/onboarding"),
      ]);

      if (authRes.ok) setSession((await authRes.json()).user);
      if (onbRes.ok) setGroupedEmployees((await onbRes.json()).groupedEmployees || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const res = await fetch("/api/v1/recruitment/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminShell user={session}>
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/admin/recruitment")}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center space-x-2">
                <UserCheck className="w-6 h-6 text-indigo-600" />
                <span>Onboarding Karyawan Baru (Checklist)</span>
              </h1>
              <p className="text-xs text-slate-500">
                Pantau pengumpulan berkas, serah terima aset laptop/ID card, dan masa adaptasi karyawan baru.
              </p>
            </div>
          </div>
        </div>

        {/* Employee Onboarding Cards */}
        <div className="space-y-6">
          {groupedEmployees.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Belum ada karyawan baru dalam proses onboarding.</p>
              <p className="text-xs text-slate-400 mt-1">
                Kandidat yang diterima melalui fitur "1-Click Konversi" akan otomatis muncul di sini.
              </p>
            </div>
          ) : (
            groupedEmployees.map((grp) => {
              const emp = grp.employee;
              const progress = grp.progressPercent;

              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5"
                >
                  {/* Header of Employee */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-black text-slate-800">
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold">
                          {emp.employeeIdNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {emp.department?.name || "-"} • {emp.position?.name || "-"} • Masuk:{" "}
                        {new Date(emp.joinDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700">
                          {grp.completed} dari {grp.total} Selesai
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Progres: {progress}%
                        </span>
                      </div>
                      <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {grp.tasks.map((task: any) => {
                      const isCompleted = task.status === "COMPLETED";

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id, task.status)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                            isCompleted
                              ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                              : "bg-slate-50 border-slate-200/80 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/20"
                          }`}
                        >
                          <button
                            type="button"
                            className="mt-0.5 shrink-0 text-indigo-600 focus:outline-none"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <div className="w-4 h-4 rounded-md border-2 border-slate-300"></div>
                            )}
                          </button>

                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold ${
                                  isCompleted ? "line-through text-slate-400" : "text-slate-800"
                                }`}
                              >
                                {task.title}
                              </span>
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-white border border-slate-200 text-slate-600 uppercase">
                                {task.category}
                              </span>
                            </div>

                            {task.dueDate && (
                              <p className="text-[10px] text-slate-400">
                                Target: {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminShell>
  );
}
