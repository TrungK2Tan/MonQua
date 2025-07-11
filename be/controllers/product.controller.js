const Product = require("../models/product.model");
const User = require("../models/auth/user.model");

exports.createProduct = async (req, res) => {
  console.log("=== Dữ liệu req.body ===");
  console.log(req.body);

  console.log("=== Dữ liệu req.file ===");
  console.log(req.file);

  try {
    // Kiểm tra nếu không có body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Dữ liệu sản phẩm không hợp lệ!" });
    }

    const {
      user_id,
      title,
      description,
      category_id,
      location,
      contact_phone,
      contact_zalo,
      is_heavy,
      delivery_method = "giao_tan_tay", // Mặc định là giao tận tay
    } = req.body;

    // Kiểm tra user tồn tại
    const userExists = await User.findById(user_id);
    if (!userExists) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Lấy URL ảnh từ Cloudinary
    const image_url = req.file?.path || null;

    const newProduct = new Product({
      user_id,
      title,
      description,
      category_id,
      location,
      contact_phone,
      contact_zalo,
      is_heavy,
      image_url,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      delivery_method,
    });

    const saved = await newProduct.save();

    res.status(201).json({
      message: "Đăng tin thành công, chờ duyệt",
      product: saved
    });
  } catch (err) {
    console.error("Lỗi khi tạo sản phẩm:", err);
    res.status(500).json({ message: "Lỗi khi tạo sản phẩm", error: err.message });
  }

};
// PUT /api/products/:id/status
exports.updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["pending", "active", "given", "hidden"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status, updated_at: new Date() },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json({
      message: "Cập nhật trạng thái thành công",
      product
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái:", err.message);
    res.status(500).json({ message: "Lỗi khi cập nhật trạng thái", error: err.message });
  }
};
// Lấy danh sách tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
  try {
    const query = {};

    // Nếu có query category
    if (req.query.category) {
      query.category_id = req.query.category;
    }

    const products = await Product.find(query)
      .populate("category_id")
      .populate("user_id");

    res.json(products);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};
// Lấy chi tiết sản phẩm theo ID
exports.getProductById = async (req, res) => {
  try {
    // Tăng view_count trước khi lấy sản phẩm
    await Product.findByIdAndUpdate(req.params.id, {
      $inc: { view_count: 1 }
    });

    // Lấy sản phẩm kèm thông tin liên quan
    const product = await Product.findById(req.params.id)
      .populate("category_id")
      .populate("user_id");

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json(product);
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết sản phẩm:", err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getProductsByUser = async (req, res) => {
  try {
    const products = await Product.find({ user_id: req.params.userId })
      .populate("category_id")
      .populate("user_id") // <-- Thêm dòng này nếu cần
      .sort({ created_at: -1 });

    res.json(products);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách sản phẩm của người dùng:", err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};
// GET /api/products/popular
exports.getPopularProducts = async (req, res) => {
  try {
    const topInterested = await Product.find()
      .sort({ interested_count: -1 })
      .limit(5);

    const topViewed = await Product.find()
      .sort({ view_count: -1 })
      .limit(5);

    // Kết hợp và loại trùng
    const combinedMap = new Map();
    [...topInterested, ...topViewed].forEach((p) => {
      combinedMap.set(p._id.toString(), p);
    });

    const combinedProducts = Array.from(combinedMap.values());

    res.json({ products: combinedProducts });
  } catch (err) {
    console.error("Lỗi khi lấy sản phẩm phổ biến:", err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};
