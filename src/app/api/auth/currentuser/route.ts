import connectToDB from "@/db";
import UserSchema from "@/schemas/userSchema";
import { tokenDecoder } from "@/utils";
import { cookies } from "next/headers";

export const POST = async (req: Request) => {
  try {
    await connectToDB();

    const cookieToken = (await cookies()).get("token")?.value;
    const bodyToken = await req
      .json()
      .then((body) => body.token)
      .catch(() => null);

    const token = cookieToken ?? bodyToken;

    if (!token)
      return Response.json(
        { message: "Вы не вошли в систему" },
        { status: 401 }
      );

    const verifiedToken = tokenDecoder(token) as { phone: string };

    const userData = await UserSchema.findOne({
      phone: verifiedToken?.phone,
    }).lean();

    if (!userData || !verifiedToken) {
      (await cookies()).delete("token");
      return Response.json(
        { message: "Нет пользователя с этим именем пользователя или паролем!" },
        { status: 401 }
      );
    }

    return Response.json(userData, { status: 200 });
  } catch (err) {
    console.log(err);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
};
