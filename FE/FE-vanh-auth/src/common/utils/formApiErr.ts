import type { FormInstance } from "antd";

export interface ApiError {
      field: string
      message: string
      code: string
    }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatApiError = (form: FormInstance<any>) => {
    return (errors: ApiError[]) => {
        errors.forEach((error) => {
            form.setFields([
                {
                    name: error.field,
                    errors: [error.message],
                },
            ]);
        });
        return "Please check the form for errors.";
    }
}
