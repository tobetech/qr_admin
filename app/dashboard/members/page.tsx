"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { logAdmin } from "@/lib/log";

interface Member {
  id: string;
  full_name: string;
  phone: string;
  balance: number;
  loyalty_points: number;
  created_at: string;
}

interface Tier {
  tier_name: string;
  min_points: number;
  sort_order: number;
}

function getTier(points: number, tiers: Tier[]) {
  const sorted = [...tiers].sort((a, b) => b.min_points - a.min_points);
  return sorted.find((t) => points >= t.min_points)?.tier_name || "-";
}

export default function MembersPage() {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [usersRes, tiersRes] = await Promise.all([
      supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("loyalty_tiers").select("*").order("sort_order"),
    ]);
    setMembers(usersRes.data || []);
    setTiers(tiersRes.data || []);
    setLoading(false);
  }

  async function handleSearch() {
    if (!search.trim()) {
      loadData();
      return;
    }
    setLoading(true);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/customers/search?phone=${search.trim()}`,
    );
    const data = await res.json();
    const found = data.customer || data.user;
    setMembers(found ? [found] : []);
    setLoading(false);
  }

  function openResetModal(m: Member) {
    setSelected(m);
    setNewPassword("");
    setError("");
    setSuccess("");
    setModal(true);
  }

  async function handleResetPassword() {
    if (!selected) return;
    if (newPassword.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/customers/${selected.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        },
      );
      if (!res.ok) throw new Error("รีเซ็ตรหัสผ่านไม่สำเร็จ");
      await logAdmin(
        "reset_password",
        `user_id=${selected.id} phone=${selected.phone}`,
      );
      setSuccess("รีเซ็ตรหัสผ่านสำเร็จ");
      setTimeout(() => setModal(false), 800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const tierBadgeClass: Record<string, string> = {
    Bronze: "badge-bronze",
    Silver: "badge-silver",
    Gold: "badge-gold",
  };

  return (
    <div>
      <div className="page-header">
        <h2>จัดการสมาชิก</h2>
        <button className="btn-sm" onClick={loadData}>
          🔄 รีเฟรช
        </button>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div className="input-wrap" style={{ maxWidth: 300 }}>
          <input
            type="tel"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="ค้นหาด้วยเบอร์โทรศัพท์"
            inputMode="numeric"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button className="btn-sm success" onClick={handleSearch}>
          🔍 ค้นหา
        </button>
        <button
          className="btn-sm"
          onClick={() => {
            setSearch("");
            loadData();
          }}
        >
          ✕ ล้าง
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>เบอร์โทร</th>
                <th>ยอดเงิน</th>
                <th>คะแนน</th>
                <th>Tier</th>
                <th>วันที่สมัคร</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      color: "#475569",
                      padding: 24,
                    }}
                  >
                    ไม่พบสมาชิก
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const tierName = getTier(m.loyalty_points || 0, tiers);
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600, color: "#f1f5f9" }}>
                        {m.full_name || "-"}
                      </td>
                      <td style={{ color: "#fbbf24" }}>{m.phone || "-"}</td>
                      <td style={{ color: "#4ade80" }}>
                        ฿{parseFloat(m.balance?.toString() || "0").toFixed(2)}
                      </td>
                      <td>{(m.loyalty_points || 0).toLocaleString()}</td>
                      <td>
                        <span
                          className={`badge ${tierBadgeClass[tierName] || "badge-silver"}`}
                        >
                          {tierName}
                        </span>
                      </td>
                      <td style={{ color: "#64748b", fontSize: 12 }}>
                        {new Date(m.created_at).toLocaleDateString("th-TH")}
                      </td>
                      <td>
                        <button
                          className="btn-sm"
                          onClick={() => openResetModal(m)}
                        >
                          🔑 รีเซ็ต Password
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Reset Password */}
      {modal && selected && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>รีเซ็ตรหัสผ่าน</h3>

            <div
              style={{
                background: "#0f172a",
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b" }}>สมาชิก</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>
                {selected.full_name || "-"}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                {selected.phone}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">รหัสผ่านใหม่</label>
              <div className="input-wrap">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && <div className="msg-error">{error}</div>}
            {success && <div className="msg-success">{success}</div>}

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(false)}>
                ยกเลิก
              </button>
              <button
                className="btn-primary"
                onClick={handleResetPassword}
                disabled={saving}
              >
                {saving ? "กำลังรีเซ็ต..." : "รีเซ็ตรหัสผ่าน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
