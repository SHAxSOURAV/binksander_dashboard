const Logo = ({ size = "text-3xl" }) => {
  return (
    <span className={`bol-logo ${size} select-none`}>
      bol<span className="text-brand">.</span>
    </span>
  );
};

export default Logo;
