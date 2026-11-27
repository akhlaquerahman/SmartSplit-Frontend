import React, { useState } from 'react';
import { Users } from 'lucide-react';

const resolveMemberInfo = (member) => {
  const userObj = member?.user && typeof member.user === 'object' ? member.user : {};
  const name = userObj.name || member?.name || 'Member';
  const avatar =
    userObj.avatar ||
    userObj.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff&bold=true`;
  const id = (userObj._id || member?.user || member?._id || name).toString();
  return { id, name, avatar };
};

const MemberAvatarImg = ({ member, className = '' }) => {
  const { name, avatar } = resolveMemberInfo(member);
  const [imgError, setImgError] = useState(false);

  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'M';

  if (imgError || !avatar) {
    return (
      <div
        title={name}
        className={`flex items-center justify-center bg-indigo-500 text-white font-black select-none ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={avatar}
      alt={name}
      title={name}
      onError={() => setImgError(true)}
      className={`object-cover bg-slate-200 ${className}`}
    />
  );
};

/**
 * Enterprise-grade adaptive group avatar cluster.
 * Displays member profile pictures cleanly inside the group icon frame for any member count.
 */
const GroupAvatarCluster = ({ members = [], size = 'lg' }) => {
  const validMembers = (members || []).filter(Boolean);
  const count = validMembers.length;
  const allNames = validMembers.map((m) => resolveMemberInfo(m).name).join(', ');

  const containerDimensions =
    size === 'sm'
      ? 'w-10 h-10 rounded-2xl p-1'
      : 'w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl p-1 md:p-1.5';

  if (count === 0) {
    return (
      <div className={`${containerDimensions} border-2 border-white/25 bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner`}>
        <Users className="w-5 h-5 md:w-9 md:h-9 text-white" strokeWidth={2.2} />
      </div>
    );
  }

  if (count === 1) {
    return (
      <div
        title={allNames}
        className={`${containerDimensions} border-2 border-white/30 bg-white/15 backdrop-blur-md shrink-0 shadow-inner overflow-hidden`}
      >
        <MemberAvatarImg
          member={validMembers[0]}
          className="w-full h-full rounded-xl md:rounded-2xl"
        />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div
        title={allNames}
        className={`${containerDimensions} relative border-2 border-white/30 bg-white/15 backdrop-blur-md shrink-0 shadow-inner`}
      >
        <div className="relative w-full h-full">
          <MemberAvatarImg
            member={validMembers[0]}
            className="w-6 h-6 md:w-11 md:h-11 rounded-full absolute top-0 left-0 ring-2 ring-blue-600/90 dark:ring-slate-800 shadow-sm z-10"
          />
          <MemberAvatarImg
            member={validMembers[1]}
            className="w-6 h-6 md:w-11 md:h-11 rounded-full absolute bottom-0 right-0 ring-2 ring-white/95 dark:ring-slate-800 shadow-md z-20"
          />
        </div>
      </div>
    );
  }

  if (count === 3) {
    return (
      <div
        title={allNames}
        className={`${containerDimensions} relative border-2 border-white/30 bg-white/15 backdrop-blur-md shrink-0 shadow-inner`}
      >
        <div className="relative w-full h-full">
          <MemberAvatarImg
            member={validMembers[0]}
            className="w-5 h-5 md:w-9 md:h-9 rounded-full absolute top-0 left-1/2 -translate-x-1/2 ring-2 ring-white/90 dark:ring-slate-800 shadow-sm z-10"
          />
          <MemberAvatarImg
            member={validMembers[1]}
            className="w-5 h-5 md:w-9 md:h-9 rounded-full absolute bottom-0 left-0 ring-2 ring-white/90 dark:ring-slate-800 shadow-sm z-20"
          />
          <MemberAvatarImg
            member={validMembers[2]}
            className="w-5 h-5 md:w-9 md:h-9 rounded-full absolute bottom-0 right-0 ring-2 ring-white/90 dark:ring-slate-800 shadow-md z-30"
          />
        </div>
      </div>
    );
  }

  if (count === 4) {
    return (
      <div
        title={allNames}
        className={`${containerDimensions} border-2 border-white/30 bg-white/15 backdrop-blur-md shrink-0 shadow-inner`}
      >
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 md:gap-1 w-full h-full">
          {validMembers.slice(0, 4).map((m, idx) => (
            <MemberAvatarImg
              key={resolveMemberInfo(m).id + idx}
              member={m}
              className="w-full h-full rounded-full ring-1 ring-white/70 text-[8px] md:text-[10px]"
            />
          ))}
        </div>
      </div>
    );
  }

  // 5+ members: 3-column mosaic showing up to 9 avatars (or 8 + "+N" overflow pill for 10+)
  const maxTiles = count > 9 ? 8 : count;
  const overflowCount = count - maxTiles;

  return (
    <div
      title={allNames}
      className={`${containerDimensions} border-2 border-white/30 bg-white/15 backdrop-blur-md shrink-0 shadow-inner`}
    >
      <div className={`grid grid-cols-3 ${count <= 6 ? 'grid-rows-2' : 'grid-rows-3'} gap-0.5 w-full h-full place-items-center`}>
        {validMembers.slice(0, maxTiles).map((m, idx) => (
          <MemberAvatarImg
            key={resolveMemberInfo(m).id + idx}
            member={m}
            className="w-full h-full aspect-square rounded-full ring-1 ring-white/70 text-[6px] md:text-[8px]"
          />
        ))}
        {overflowCount > 0 && (
          <div className="w-full h-full aspect-square rounded-full bg-slate-900/80 text-white border border-white/70 flex items-center justify-center text-[7px] md:text-[9px] font-black">
            +{overflowCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupAvatarCluster;
