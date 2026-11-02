"use client";

import { CustomCheckbox } from "@/components/common/custom-checkbox";
import { FavoriteButton } from "@/components/common/favorite-button";
import { MemberAvatar } from "@/components/address-book/member-avatar";
import { MeBadge } from "@/components/common/me-badge";
import { LoadingState } from "@/components/common/loading";
import type { AddressBookMember } from "@/lib/api/address-book-api";

export function MemberTable({
  members,
  myMembershipId,
  selectedMemberId,
  selectedMemberIds,
  sort,
  direction,
  onSort,
  onSelectMember,
  onToggleFavorite,
  onToggleSelection,
  loading = false,
}: {
  members: AddressBookMember[];
  // 본인 줄에 "나" 딱지를 붙이기 위한 로그인 사용자 ID.
  myMembershipId: number;
  selectedMemberId: number | null;
  selectedMemberIds: number[];
  sort: string;
  direction: string;
  onSort: (key: string) => void;
  onSelectMember: (member: AddressBookMember) => void;
  onToggleFavorite: (member: AddressBookMember) => void;
  onToggleSelection: (membershipId: number) => void;
  // 목록을 불러오는 중이면 줄 대신 로딩 표시.
  loading?: boolean;
}) {
  return (
    // 칸 너비를 고정 비율로 정해(table-fixed) 데이터를 받기 전후·페이지마다 머리글이 좌우로 움직이지 않게 함.
    // 세로 스크롤바가 생겼다 사라져도 폭이 변하지 않도록 스크롤바 자리를 미리 확보.
    <div className="min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
      <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-11" />
          <col className="w-[22%]" />
          <col className="w-[13%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[22%]" />
          <col />
        </colgroup>
        <thead className="border-b border-slate-200 bg-white text-slate-700">
          <tr>
            <th className="w-11 px-3 py-3" />
            {[
              ["name", "이름"],
              ["jobGrade", "직책/직급"],
              ["department", "부서"],
              ["company", "소속"],
              ["email", "이메일"],
              ["phone", "전화번호"],
            ].map(([key, label]) => (
              <th key={key} className="px-4 py-3 font-semibold">
                <button className="cursor-pointer hover:text-blue-600" onClick={() => onSort(key)}>
                  {label}
                  {sort === key ? (direction === "asc" ? " ↓" : " ↑") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!loading &&
            members.map((target) => (
              <tr
                key={target.membershipId}
                className={`cursor-pointer border-b border-slate-100 transition hover:bg-blue-50 ${selectedMemberId === target.membershipId ? "bg-blue-50" : ""}`}
                onClick={() => onSelectMember(target)}
              >
                <td className="px-3 py-3">
                  <span onClick={(event) => event.stopPropagation()}>
                    <CustomCheckbox
                      label={`${target.displayName} 선택`}
                      checked={selectedMemberIds.includes(target.membershipId)}
                      onChange={() => onToggleSelection(target.membershipId)}
                    />
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0" onClick={(event) => event.stopPropagation()}>
                      <FavoriteButton
                        active={target.favorite}
                        onClick={() => onToggleFavorite(target)}
                      />
                    </span>
                    <MemberAvatar member={target} />
                    {target.membershipId === myMembershipId && <MeBadge />}
                    <b className="truncate" title={target.displayName}>
                      {target.displayName}
                    </b>
                  </div>
                </td>
                <Cell text={[target.jobTitle, target.jobGradeName].filter(Boolean).join(" / ")} />
                <Cell text={target.departmentName} />
                <Cell text={target.companyName} />
                <Cell text={target.email} />
                <Cell text={target.phoneNumber} />
              </tr>
            ))}
        </tbody>
      </table>
      {loading ? (
        // 불러오는 중에는 빈 목록 안내 대신 로딩 표시.
        <LoadingState message="구성원을 불러오는 중입니다." className="p-12" />
      ) : (
        members.length === 0 && (
          <p className="p-12 text-center text-sm text-slate-500">표시할 구성원이 없습니다.</p>
        )
      )}
    </div>
  );
}

// 고정 너비 칸. 넘치면 "…"로 줄이고 마우스를 올리면 전체 글자. 비어 있으면 "-".
function Cell({ text }: { text: string | null | undefined }) {
  return (
    <td className="truncate px-4 py-3" title={text || undefined}>
      {text || "-"}
    </td>
  );
}
