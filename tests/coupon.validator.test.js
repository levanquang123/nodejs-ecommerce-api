const {
  createCouponSchema,
  updateCouponSchema,
} = require("../validators/coupon.validator");

const validCoupon = {
  couponCode: "spring-sale",
  discountType: "percentage",
  discountAmount: 30,
  minimumPurchaseAmount: 100,
  endDate: "2099-12-31",
  status: "active",
};

describe("Coupon validation", () => {
  it("rejects percentage discounts greater than 100", () => {
    const { error } = createCouponSchema.validate({
      ...validCoupon,
      discountAmount: 300,
    });

    expect(error).toBeDefined();
    expect(error.details[0].message).toBe(
      "Percentage discount cannot be greater than 100."
    );
  });

  it("allows fixed discounts greater than 100", () => {
    const { error } = createCouponSchema.validate({
      ...validCoupon,
      discountType: "fixed",
      discountAmount: 300,
    });

    expect(error).toBeUndefined();
  });

  it("rejects zero-value discounts on update", () => {
    const { error } = updateCouponSchema.validate({
      ...validCoupon,
      discountAmount: 0,
    });

    expect(error).toBeDefined();
    expect(error.details[0].message).toBe(
      "Percentage discount must be greater than 0."
    );
  });
});
