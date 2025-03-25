import { Outlet, useParams } from "react-router-dom";

export const Meeting = () => {
  const { meetingId } = useParams();
  return (
    <div>
      <h1>Meeting {meetingId}</h1>
      <Outlet />
    </div>
  );
};
